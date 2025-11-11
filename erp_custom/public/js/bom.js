// frappe.ui.form.on('BOM', {
//     validate: function(frm) {
//         if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness && frm.doc.custom_density) {
//             let weight = (frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * frm.doc.custom_density) / 1000000;
//             let final_weight = flt(weight, 2);

//             frm.set_value("custom_kilogramskgs", final_weight);

//             // Commented: not needed now
//             // frm.set_value("weight_per_unit", final_weight);
//             // frm.set_value("custom_weight_per_unit", final_weight);
//             // frm.set_value("weight_uom", "Kg");
//             // frm.set_value("custom_weight_uom", "Kg");
//         } else {
//             frm.set_value("custom_kilogramskgs", 0);

//             // Commented: not needed now
//             // frm.set_value("weight_per_unit", 0);
//             // frm.set_value("custom_weight_per_unit", 0);
//             // frm.set_value("weight_uom", "Kg");
//             // frm.set_value("custom_weight_uom", "Kg");
//         }


//         if (frm.doc.items && frm.doc.items.length > 0) {
//             frm.doc.items.forEach(row => {
//                 row.qty = frm.doc.custom_kilogramskgs || 0;
//                 row.uom = "Kg";
//             });
//             frm.refresh_field("items");
//         }
//     },


//     custom_kilogramskgs: function(frm) {
//         if (frm.doc.items && frm.doc.items.length > 0) {
//             frm.doc.items.forEach(row => {
//                 row.qty = frm.doc.custom_kilogramskgs || 0;
//                 row.uom = "Kg"; 
//             });
//             frm.refresh_field("items");
//         }
//     }
// });







// frappe.ui.form.on('BOM Item', {
//     items_add: function(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         row.qty = frm.doc.custom_kilogramskgs || 0;
//         row.uom = "Kg"; 
//         frm.refresh_field("items");
//     },
//     custom_length: calculate_kgs,
//     custom_width: calculate_kgs,
//     custom_thickness: calculate_kgs,
//     custom_density: calculate_kgs
// });

// function calculate_kgs(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     if (row.custom_length && row.custom_width && row.custom_thickness && row.custom_density) {
//         let weight = (row.custom_length * row.custom_width * row.custom_thickness * row.custom_density) / 1000000;
//         frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', flt(weight, 2));
//     } else {
//         frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', 0);
//     }
// }





//   Last used worked code
// frappe.ui.form.on('BOM Item', {
//     items_add: function(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         row.qty = row.custom_kilogramskgs || 0;
//         row.uom = "Kg"; 
//         frm.refresh_field("items");
//     },
//     custom_length: calculate_kgs,
//     custom_width: calculate_kgs,
//     custom_thickness: calculate_kgs,
//     custom_density: calculate_kgs
// });

// function calculate_kgs(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     let length = parseFloat(row.custom_length) || 0;
//     let width = parseFloat(row.custom_width) || 0;
//     let thickness = parseFloat(row.custom_thickness) || 0;
//     let density = parseFloat(row.custom_density) || 0;

//     let weight = 0;

//     if (length && width && thickness && density) {
//         weight = (length * width * thickness * density) / 1000000;
//         weight = flt(weight, 2);
//     }

//     frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', weight);

//     // frappe.model.set_value(cdt, cdn, 'qty', weight);
//     frappe.model.set_value(cdt, cdn, 'qty', flt(weight, 2));
//     // frappe.model.set_value(cdt, cdn, 'qty', Math.round(weight));
//     frappe.model.set_value(cdt, cdn, 'uom', "Kg");

//     frm.refresh_field("items");
// }




// frappe.ui.form.on('BOM Item', {
//     items_add: function(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         row.qty = row.custom_kilogramskgs || 0;
//         row.uom = "Kg"; 
//         frm.refresh_field("items");
//     },

//     custom_length: calculate_kgs,
//     custom_width: calculate_kgs,
//     custom_thickness: calculate_kgs,
//     custom_outer_diameter: calculate_kgs,
//     custom_inner_diameter: calculate_kgs,
//     custom_density: calculate_kgs,
//     custom_raw_material_type: calculate_kgs
// });

// function calculate_kgs(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     let material = row.custom_raw_material_type;
//     let density = parseFloat(row.custom_density) || 0;
//     let weight = 0;

//     // Common checks
//     if (!material || !density) {
//         frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', 0);
//         return;
//     }

//     // Plate calculation
//     if (material === "Plate") {
//         let length = parseFloat(row.custom_length) || 0;
//         let width = parseFloat(row.custom_width) || 0;
//         let thickness = parseFloat(row.custom_thickness) || 0;

//         if (length && width && thickness) {
//             weight = (length * width * thickness * density) / 1_000_000;
//         }
//     }

//     // Tube calculation
//     if (material === "Tube") {
//         let length = parseFloat(row.custom_length) || 0;
//         let outer = parseFloat(row.custom_outer_diameter) / 2 || 0;
//         let inner = parseFloat(row.custom_inner_diameter) / 2 || 0;
//         const π = Math.PI;

//         if (outer && inner && length) {
//             let volume = π * (outer ** 2 - inner ** 2) * length;
//             weight = (volume * density) / 1_000_000;
//         }
//     }

//     // Set weight and qty
//     weight = flt(weight, 2);
//     frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', weight);
//     frappe.model.set_value(cdt, cdn, 'qty', weight);
//     frappe.model.set_value(cdt, cdn, 'uom', "Kg");

//     frm.refresh_field("items");
// }




frappe.ui.form.on('BOM Item', {
    // 🔹 When Item is selected, auto fetch Item Group and re-trigger weight logic
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', row.item_code, 'item_group', (r) => {
                if (r && r.item_group) {
                    frappe.model.set_value(cdt, cdn, 'custom_item_group', r.item_group);
                    toggle_fields(frm, cdt, cdn);
                    calculate_kgs(frm, cdt, cdn);
                }
            });
        }
    },

    // 🔹 Recalculate if user changes group manually
    custom_item_group(frm, cdt, cdn) {
        toggle_fields(frm, cdt, cdn);
        calculate_kgs(frm, cdt, cdn);
    },

    // 🔹 Recalculate when dimension/density fields change
    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,
    custom_outer_diameter: calculate_kgs,
    custom_inner_diameter: calculate_kgs,
    custom_wall_thickness: calculate_kgs,
    custom_density: calculate_kgs,

    // 🔹 If quantity changes → update total weight
    qty(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const qty_val = parseFloat(row.qty) || 0;
        const base_weight = parseFloat(row.custom_base_weight) || 0;
        frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', flt(qty_val * base_weight, 2));
    }
});

function toggle_fields(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const grid = frm.fields_dict["items"].grid;
    const type = row.custom_item_group;

    const all_fields = [
        "custom_length", "custom_width", "custom_thickness",
        "custom_outer_diameter", "custom_inner_diameter", "custom_wall_thickness"
    ];
    all_fields.forEach(f => grid.toggle_display(f, false));

    // ✅ Show only relevant fields per material
    if (type === "Plates") {
        grid.toggle_display("custom_length", true);
        grid.toggle_display("custom_width", true);
        grid.toggle_display("custom_thickness", true);
    } 
    else if (["Tubes", "Pipes"].includes(type)) {
        grid.toggle_display("custom_length", true);
        grid.toggle_display("custom_outer_diameter", true);
        grid.toggle_display("custom_wall_thickness", true);
    } 
    else if (["Flanges", "Rings"].includes(type)) {
        grid.toggle_display("custom_outer_diameter", true);
        grid.toggle_display("custom_inner_diameter", true);
        grid.toggle_display("custom_thickness", true);
    } 
    else if (type === "Rods") {
        grid.toggle_display("custom_length", true);
        grid.toggle_display("custom_outer_diameter", true);
    } 
    else if (type === "Forgings") {
        grid.toggle_display("custom_length", true);
        grid.toggle_display("custom_outer_diameter", true);
        grid.toggle_display("custom_wall_thickness", true);
    }

    frm.refresh_field("items");
}

function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.custom_item_group;
    const density = parseFloat(row.custom_density) || 0; 
    const π = Math.PI;
    let base_weight = 0;

    // ---- Plates ----
    if (type === "Plates") {
        const L = parseFloat(row.custom_length) || 0;
        const W = parseFloat(row.custom_width) || 0;
        const T = parseFloat(row.custom_thickness) || 0;
        if (L && W && T && density)
            base_weight = (L * W * T * density) / 1_000_000;
    }

    // ---- Tubes / Pipes ----
    else if (["Tubes", "Pipes"].includes(type)) {
        const L = parseFloat(row.custom_length) || 0;
        const OD = parseFloat(row.custom_outer_diameter) || 0;
        const WT = parseFloat(row.custom_wall_thickness) || 0;
        if (OD && WT && L && density) {
            const R = OD / 2;
            const r = R - WT;
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }

    // ---- Flanges / Rings ----
    else if (["Flanges", "Rings"].includes(type)) {
        const OD = parseFloat(row.custom_outer_diameter) || 0;
        const ID = parseFloat(row.custom_inner_diameter) || 0;
        const T = parseFloat(row.custom_thickness) || 0;
        if (OD && ID && T && density) {
            const R = OD / 2;
            const r = ID / 2;
            base_weight = (π * (R**2 - r**2) * T * density) / 1_000_000;
        }
    }

    // ---- Rods (solid cylinder) ----
    else if (type === "Rods") {
        const L = parseFloat(row.custom_length) || 0;
        const D = parseFloat(row.custom_outer_diameter) || 0;
        if (L && D && density) {
            const R = D / 2;
            const volume = π * (R**2) * L;
            base_weight = (volume * density) / 1_000_000;
        }
    }

    // ---- Forgings ----
    else if (type === "Forgings") {
        const L = parseFloat(row.custom_length) || 0;
        const OD = parseFloat(row.custom_outer_diameter) || 0;
        const WT = parseFloat(row.custom_wall_thickness) || 0;
        if (L && OD && WT && density) {
            const R = OD / 2;
            const r = Math.max(R - WT, 0);
            const volume = π * (R**2 - r**2) * L;
            base_weight = (volume * density) / 1_000_000;
        }
    }

    // ---- Others ----
    else if (type === "Other") {
        base_weight = parseFloat(row.custom_kilogramskgs) / (parseFloat(row.qty) || 1) || 0;
    }

    // ✅ Update all weight-related fields
    frappe.model.set_value(cdt, cdn, 'custom_base_weight', flt(base_weight, 4));
    const total_weight = flt(base_weight * (parseFloat(row.qty) || 1), 2);
    frappe.model.set_value(cdt, cdn, 'custom_kilogramskgs', total_weight);
    frappe.model.set_value(cdt, cdn, 'uom', "Kg");

    frm.refresh_field("items");
}
