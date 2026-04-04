
frappe.ui.form.on('BOM Creator', {
    refresh(frm) {

        if (frm.is_new()) return;

        frm.add_custom_button(__('Upload BOM'), () => {

            new frappe.ui.FileUploader({
                allow_multiple: false,

                on_success(file) {

                    frappe.call({
                        method: "erp_custom.erp_custom.overrides.bom_creator.upload_bom_excel",
                        args: {
                            file_url: file.file_url
                        },
                        freeze: true,

                        callback: function (r) {

                            if (!r.message) return;

                            frm.clear_table("items");

                            r.message.forEach(row => {
                                let child = frm.add_child("items");

                                for (let key in row) {
                                    child[key] = row[key];
                                }
                            });

                            frm.refresh_field("items");

                            frappe.show_alert({
                                message: "BOM Excel Imported Successfully",
                                indicator: "green"
                            });
                        }
                    });

                }
            });

        }, __('Actions'));
    }
});


frappe.ui.form.on('BOM Creator Item', {

    qty: trigger_all,
    custom_length: trigger_all,
    custom_width: trigger_all,
    custom_thickness: trigger_all,
    custom_density: trigger_all,
    custom_outer_diameter: trigger_all,
    custom_inner_diameter: trigger_all,
    custom_wall_thickness: trigger_all,
    custom_scrap_margin_percentage: trigger_all,
    custom_transportation_cost: trigger_all,
    item_group: trigger_all,
    custom_item_group: trigger_all
});


function trigger_all(frm, cdt, cdn) {
    calculate_kgs(frm, cdt, cdn);
    calculate_total_weight(frm, cdt, cdn);
    calculate_scrap_and_transport(frm, cdt, cdn);
}


// ===============================
// SAME AS BOM.JS LOGIC
// ===============================
function calculate_kgs(frm, cdt, cdn) {

    const row = locals[cdt][cdn];
    const type = row.item_group || row.custom_item_group;
    const density = flt(row.custom_density) || 0;
    const π = Math.PI;

    let base_weight = 0;

    if (!density) {
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
        return;
    }

    if (type === "Plates") {
        base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
    }

    else if (["Tubes", "Pipes"].includes(type)) {
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);

        base_weight = (π * (R**2 - r**2) * flt(row.custom_length) * density) / 1000000;
    }

    frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(base_weight, 4));
}


function calculate_total_weight(frm, cdt, cdn) {

    const row = locals[cdt][cdn];

    const total_weight = flt(row.qty) * flt(row.custom_kilogramskgs);

    frappe.model.set_value(cdt, cdn, "custom_total_weight", flt(total_weight, 4));
}


function calculate_scrap_and_transport(frm, cdt, cdn) {

    const row = locals[cdt][cdn];

    const total_weight = flt(row.custom_total_weight) || 0;
    const scrap_pct = flt(row.custom_scrap_margin_percentage) || 0;
    const transport_rate = flt(row.custom_transportation_cost) || 0;

    frappe.model.set_value(
        cdt,
        cdn,
        "custom_scrap_margin_kgs",
        flt(total_weight * (scrap_pct / 100), 4)
    );

    frappe.model.set_value(
        cdt,
        cdn,
        "custom_transportation_cost_kgs",
        flt(total_weight * transport_rate, 2)
    );
}