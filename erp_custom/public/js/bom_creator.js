
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
    btn.removeClass('btn-default btn-danger')
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
    }
});


// =====================================================
// MAIN TRIGGER (CALL PYTHON)
// =====================================================
function trigger_calc(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    frappe.call({
        method: "erp_custom.erp_custom.overrides.bom_creator.recalc_item",
        args: {
            item: JSON.stringify(row) 
        },
        callback: function(r) {
            if (r.message) {
                Object.assign(row, r.message);
                frm.refresh_field("items");
            }
        }
    });
}

// frappe.ui.form.on('BOM Creator Item', {

//     qty: trigger_all,
//     custom_length: trigger_all,
//     custom_width: trigger_all,
//     custom_thickness: trigger_all,
//     custom_density: trigger_all,
//     custom_outer_diameter: trigger_all,
//     custom_inner_diameter: trigger_all,
//     custom_wall_thickness: trigger_all,
//     custom_scrap_margin_percentage: trigger_all,
//     custom_transportation_cost: trigger_all,
//     item_group: trigger_all,
//     custom_item_group: trigger_all,
    
//     custom_shape(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     // reset all
//     row.custom_width = 0;
//     row.custom_thickness = 0;
//     row.custom_inner_diameter = 0;
//     row.custom_wall_thickness = 0;

//     frm.refresh_field("items");
//     trigger_all(frm, cdt, cdn);
// }
// });


// function trigger_all(frm, cdt, cdn) {
//     calculate_kgs(frm, cdt, cdn);
//     calculate_total_weight(frm, cdt, cdn);
//     calculate_scrap_and_transport(frm, cdt, cdn);
// }


// ===============================
// SAME AS BOM.JS LOGIC
// ===============================
// function calculate_kgs(frm, cdt, cdn) {

//     const row = locals[cdt][cdn];
//     const type = row.item_group || row.custom_item_group;
//     const density = flt(row.custom_density) || 0;
//     const π = Math.PI;

//     let base_weight = 0;

//     if (!density) {
//         frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
//         return;
//     }

//     // if (type === "Plates" && custom_shape ===  "rectangle") {
//     //     base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
//     // }
    
//     if (type === "Plates") {
//     const shape = row.custom_shape;
//     if (shape === "N/A")   return;
//     // Rectangle
//     if (shape === "Rectangle") {
//         // Formula: L * b * t * den
//         base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
//     }

//     // Circle (solid)
//     else if (shape === "Circle") {
//     const OD = flt(row.custom_outer_diameter);
//     console.log("OD:", OD, "Length:", row.custom_length, "Density:", density);
    
//    // base_weight = (Math.PI / 4) * (OD * OD) * flt(row.custom_outer_diameter) * density / 1000000;
//    // Formula: pi * (OD/2)² * t * den || W=π⋅(2OD​)2⋅t⋅ρ
//    base_weight = (Math.PI/ 4)  * (OD * OD) * flt(row.custom_thickness) * density / 1000000;
//   // pi * (OD/2)² * t * den
//     console.log("Calculated Base Weight:", base_weight);
//     }

//     // Hollow
//     else if (shape === "Hollow") {
//     const ID = flt(row.custom_inner_diameter);
//     const t = flt(row.custom_thickness);

//     if (!row.custom_length || !ID || !t) return;
//     const OD = ID + (2 * t);
//     base_weight = (Math.PI / 4) * ((OD * OD) - (ID * ID)) * flt(row.custom_length) * density / 1000000;
//     }
//     }

//     else if (["Tubes", "Pipes"].includes(type)) {
//         if (shape === "N/A")   return;
//         const R = flt(row.custom_outer_diameter) / 2;
//         const r = Math.max(R - flt(row.custom_wall_thickness), 0);
//         base_weight = (π * (R**2 - r**2) * flt(row.custom_length) * density) / 1000000;
//     }

//     else if (["Flanges", "Rings"].includes(type)) {
//         if (shape === "N/A")   return;
//         base_weight = (π * ((flt(row.custom_outer_diameter) / 2) ** 2 - (flt(row.custom_inner_diameter) / 2) ** 2) * flt(row.custom_thickness) * density) / 1000000;
//     }

//     else if (type === "Rods") {
//         if (shape === "N/A")   return;
//         if (shape === "Circle"){
//         base_weight = (π * (flt(row.custom_outer_diameter) / 2) ** 2 * flt(row.custom_length) * density) / 1000000;
//     }
//     }

//     else if (type === "Forgings") {
//         if (shape === "N/A")   return;
//         if (shape === "Circle"){
//         const R = flt(row.custom_outer_diameter) / 2;
//         const r = Math.max(R - flt(row.custom_wall_thickness), 0);
//         base_weight = (π * (R ** 2 - r ** 2) * flt(row.custom_length) * density) / 1000000;
// }
//     }

//     frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(base_weight, 4));
// }

// function calculate_kgs(frm, cdt, cdn) {

//     const row = locals[cdt][cdn];
//     const type = row.item_group || row.custom_item_group;
//     const shape = row.custom_shape;
//     const density = flt(row.custom_density) || 0;
//     const π = Math.PI;

//     let base_weight = 0;

//     if (!density) {
//         frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
//         return;
//     }

//     // Plates
//     if (type === "Plates") {

//         if (shape === "N/A") return;

//         if (shape === "Rectangle") {
//             if (!row.custom_length || !row.custom_width || !row.custom_thickness) return;

//             base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
//         }

//         else if (shape === "Circle") {
//             const OD = flt(row.custom_outer_diameter);
//             const t = flt(row.custom_thickness);

//             if (!OD || !t) return;

//             base_weight = (π / 4) * (OD * OD) * t * density / 1000000;
//         }

//         else if (shape === "Hollow") {
//             const ID = flt(row.custom_inner_diameter);
//             const t = flt(row.custom_thickness);

//             if (!row.custom_length || !ID || !t) return;

//             const OD = ID + (2 * t);
//             base_weight = (π / 4) * ((OD * OD) - (ID * ID)) * flt(row.custom_length) * density / 1000000;
//         }
//     }

//     // Tubes / Pipes (FIXED)
//     // else if (["Tubes", "Pipes"].includes(type)) {

//     //     if (shape === "N/A") return;

//     //     const OD = flt(row.custom_outer_diameter);
//     //     const wall = flt(row.custom_wall_thickness);
//     //     const length = flt(row.custom_length);

//     //     if (!OD || !wall || !length) return;

//     //     const R = OD / 2;
//     //     const r = Math.max(R - wall, 0);

//     //     base_weight = (π * (R**2 - r**2) * length * density) / 1000000;
//     // }
//     else if (["Pipes", "Tubes"].includes(type) || (type === "Forgings" && shape === "Hollow")) {

//     const OD = flt(row.custom_outer_diameter);
//     const wall = flt(row.custom_wall_thickness);
//     const length = flt(row.custom_length);

//     if (!OD || !wall || !length) return;
//     const ID = OD - (2 * wall);
//     base_weight = (Math.PI * ((OD / 2) ** 2 - (ID / 2) ** 2) * length * density) / 1000000;
// }

//     // Flanges / Rings
//     else if (["Flanges", "Rings"].includes(type)) {

//         if (shape === "N/A") return;

//         const OD = flt(row.custom_outer_diameter);
//         const ID = flt(row.custom_inner_diameter);
//         const t = flt(row.custom_thickness);

//         if (!OD || !ID || !t) return;

//         base_weight = (π * ((OD / 2) ** 2 - (ID / 2) ** 2) * t * density) / 1000000;
//     }

//     // Rods (FIXED)
//     else if (type === "Rods") {

//         if (shape === "N/A") return;

//         const OD = flt(row.custom_outer_diameter);
//         const length = flt(row.custom_length);

//         if (shape === "Circle" && OD && length) {
//             base_weight = (π * (OD / 2) ** 2 * length * density) / 1000000;
//         }
//     }

//     // Forgings (FIXED)
//     else if (type === "Forgings") {

//         if (shape === "N/A") return;

//         // const OD = flt(row.custom_outer_diameter);
//         // const wall = flt(row.custom_wall_thickness);
//         // const length = flt(row.custom_length);

//         // if (shape === "Circle" && OD && wall && length) {
//         //     const R = OD / 2;
//         //     const r = Math.max(R - wall, 0);

//         //     base_weight = (π * (R ** 2 - r ** 2) * length * density) / 1000000;
//         // }
//         const OD = flt(row.custom_outer_diameter);
//         const THK = flt(row.custom_thickness);

//     // Circle (SOLID)
//     if (shape === "Circle" && OD && THK) {
//         base_weight = (Math.PI * (OD / 2) ** 2 * THK * density) / 1000000;
//     }
//     }

//     frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(base_weight, 4));
// }


// function calculate_total_weight(frm, cdt, cdn) {

//     const row = locals[cdt][cdn];
//     const total_weight = flt(row.qty) * flt(row.custom_kilogramskgs);

//     frappe.model.set_value(cdt, cdn, "custom_total_weight", flt(total_weight, 4));
// }


// function calculate_scrap_and_transport(frm, cdt, cdn) {

//     const row = locals[cdt][cdn];
//     const total_weight = flt(row.custom_total_weight) || 0;
//     const scrap_pct = flt(row.custom_scrap_margin_percentage) || 0;
//     const transport_rate = flt(row.custom_transportation_cost) || 0;

//     frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kgs", flt(total_weight * (scrap_pct / 100), 4));
//     frappe.model.set_value(cdt, cdn, "custom_transportation_cost_kgs", flt(total_weight * transport_rate, 2));
// }