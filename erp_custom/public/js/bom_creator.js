
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

                        frappe.show_alert({
                            message: "BOM Excel Imported Successfully",
                            indicator: "green"
                        });
                    }
                });

            }
        });

    });

    // ✅ Proper styling
    btn.removeClass('btn-default btn-danger ')
       .addClass('btn-primary ')
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
    custom_item_group: trigger_all,
    
    custom_shape(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    // reset all
    row.custom_width = 0;
    row.custom_thickness = 0;
    row.custom_inner_diameter = 0;
    row.custom_wall_thickness = 0;

    frm.refresh_field("items");
    trigger_all(frm, cdt, cdn);
}
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

    // if (type === "Plates" && custom_shape ===  "rectangle") {
    //     base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
    // }
    
    if (type === "Plates") {
    const shape = row.custom_shape;
    if (shape === "N/A")   return;
    // Rectangle
    if (shape === "Rectangle") {
        // Formula: L * b * t * den
        base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
    }

    // Circle (solid)
    else if (shape === "Circle") {
    const OD = flt(row.custom_outer_diameter);
    console.log("OD:", OD, "Length:", row.custom_length, "Density:", density);
    
   // base_weight = (Math.PI / 4) * (OD * OD) * flt(row.custom_outer_diameter) * density / 1000000;
   // Formula: pi * (OD/2)² * t * den || W=π⋅(2OD​)2⋅t⋅ρ
   base_weight = (Math.PI/ 4)  * (OD * OD) * flt(row.custom_thickness) * density / 1000000;
  // pi * (OD/2)² * t * den
    console.log("Calculated Base Weight:", base_weight);
    }

    // Hollow
    else if (shape === "Hollow") {
    const ID = flt(row.custom_inner_diameter);
    const t = flt(row.custom_thickness);

    if (!row.custom_length || !ID || !t) return;
    const OD = ID + (2 * t);
    base_weight = (Math.PI / 4) * ((OD * OD) - (ID * ID)) * flt(row.custom_length) * density / 1000000;
    }
    }

    else if (["Tubes", "Pipes"].includes(type)) {
        if (shape === "N/A")   return;
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight = (π * (R**2 - r**2) * flt(row.custom_length) * density) / 1000000;
    }

    else if (["Flanges", "Rings"].includes(type)) {
        if (shape === "N/A")   return;
        base_weight = (π * ((flt(row.custom_outer_diameter) / 2) ** 2 - (flt(row.custom_inner_diameter) / 2) ** 2) * flt(row.custom_thickness) * density) / 1000000;
    }

    else if (type === "Rods") {
        if (shape === "N/A")   return;
        if (shape === "Circle"){
        base_weight = (π * (flt(row.custom_outer_diameter) / 2) ** 2 * flt(row.custom_length) * density) / 1000000;
    }
    }

    else if (type === "Forgings") {
        if (shape === "N/A")   return;
        if (shape === "Circle"){
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight = (π * (R ** 2 - r ** 2) * flt(row.custom_length) * density) / 1000000;
}
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

    frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kgs", flt(total_weight * (scrap_pct / 100), 4));
    frappe.model.set_value(cdt, cdn, "custom_transportation_cost_kgs", flt(total_weight * transport_rate, 2));
}