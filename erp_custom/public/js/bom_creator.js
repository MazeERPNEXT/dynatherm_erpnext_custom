
frappe.ui.form.on('BOM Creator', {
    refresh(frm) {

        if (frm.is_new() || frm.doc.docstatus !== 0) return;

        let btn = frm.add_custom_button('Upload BOM', () => {

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

                            setTimeout(() => {
                                calculate_total_bom_weight(frm);
                            }, 100);

                            frappe.show_alert({
                                message: "BOM Excel Imported Successfully",
                                indicator: "green"
                            });
                        }
                    });

                }
            });

        });

        // ✅ Button styling
        btn.removeClass('btn-default btn-danger')
           .addClass('btn-primary')
           .html('<svg class="icon icon-sm"><use href="#icon-upload"></use></svg>')
           .attr('title', 'Upload BOM')
           .css({
               'border-radius': '50%',
               'width': '38px',
               'height': '38px',
               'display': 'inline-flex',
               'align-items': 'center',
               'justify-content': 'center',
               'padding': '0',
           });
    }
});

frappe.ui.form.on('BOM Creator Item', {

    qty: trigger_calc,
    custom_length: trigger_calc,
    custom_width: trigger_calc,
    custom_thickness: trigger_calc,
    custom_density: trigger_calc,
    custom_outer_diameter: trigger_calc,
    custom_inner_diameter: trigger_calc,
    custom_wall_thickness: trigger_calc,
    custom_scrap_margin_percentage: trigger_calc,
    custom_transportation_cost: trigger_calc,
    item_group: trigger_calc,
    custom_shape: trigger_calc,


    custom_shape(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // reset shape-dependent fields
        row.custom_width = 0;
        row.custom_thickness = 0;
        row.custom_inner_diameter = 0;
        row.custom_wall_thickness = 0;

        frm.refresh_field("items");

        trigger_calc(frm, cdt, cdn);
    },

    custom_total_weight(frm) {
        calculate_total_bom_weight(frm);
    },

    items_add(frm) {
        calculate_total_bom_weight(frm);
    },

    items_remove(frm) {
        calculate_total_bom_weight(frm);
    },
});


function trigger_calc(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    frappe.call({
        method: "erp_custom.erp_custom.overrides.bom_creator.recalc_item",
        args: {
            item: JSON.stringify(row)
        },
        callback: function (r) {

            if (r.message) {

                Object.assign(row, r.message);

                // ✅ refresh only this row
                frm.refresh_field("items");

                calculate_total_bom_weight(frm);
            }
        }
    });
}

function calculate_total_bom_weight(frm) {

    let total = 0;

    (frm.doc.items || []).forEach(row => {
        total += flt(row.custom_total_weight);
    });

    frm.set_value("custom_total_bom_weight", flt(total, 4));
}
