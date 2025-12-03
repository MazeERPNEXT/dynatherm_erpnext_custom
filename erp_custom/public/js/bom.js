// frappe.ui.form.on("BOM Item", {

//     item_code(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         if (!row.item_code) return;

//         frappe.db.get_value("Item", row.item_code,
//             ["item_name", "item_group", "default_bom"],
//             (r) => {
//                 if (!r) return;

//                 if (r.item_group) {
//                     frappe.model.set_value(cdt, cdn, "custom_item_group", r.item_group);
//                 }

//                 if (r.default_bom) {
//                     frappe.model.set_value(cdt, cdn, "bom_no", r.default_bom);
//                 }

//                 toggle_fields(frm, cdt, cdn);
//                 calculate_kgs(frm, cdt, cdn);
//             }
//         );
//     },

//     custom_item_group(frm, cdt, cdn) {
//         toggle_fields(frm, cdt, cdn);
//         calculate_kgs(frm, cdt, cdn);
//     },

//     custom_length: calculate_kgs,
//     custom_width: calculate_kgs,
//     custom_thickness: calculate_kgs,
//     custom_outer_diameter: calculate_kgs,
//     custom_inner_diameter: calculate_kgs,
//     custom_wall_thickness: calculate_kgs,
//     custom_density: calculate_kgs,

//     custom_kilogramskgs(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         const weight = flt(row.custom_kilogramskgs) || 0;
//         frappe.model.set_value(cdt, cdn, "qty", weight);
//         frm.refresh_field("items");
//     }
// });

// function toggle_fields(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
//     const type = row.custom_item_group;
//     const grid = frm.fields_dict["items"].grid;

//     const all_fields = [
//         "custom_length",
//         "custom_width",
//         "custom_thickness",
//         "custom_outer_diameter",
//         "custom_inner_diameter",
//         "custom_wall_thickness",
//     ];

//     const manual_groups = ["Fasters", "Gaskets"];
//     all_fields.forEach(f => grid.toggle_display(f, false));

//     if (manual_groups.includes(type)) {
//         frm.refresh_field("items");
//         return;
//     }

//     if (type === "Plates") {
//         grid.toggle_display("custom_length", true);
//         grid.toggle_display("custom_width", true);
//         grid.toggle_display("custom_thickness", true);
//     }

//     else if (["Tubes", "Pipes"].includes(type)) {
//         grid.toggle_display("custom_length", true);
//         grid.toggle_display("custom_outer_diameter", true);
//         grid.toggle_display("custom_wall_thickness", true);
//     }

//     else if (["Flanges", "Rings"].includes(type)) {
//         grid.toggle_display("custom_outer_diameter", true);
//         grid.toggle_display("custom_inner_diameter", true);
//         grid.toggle_display("custom_thickness", true);
//     }

//     else if (type === "Rods") {
//         grid.toggle_display("custom_length", true);
//         grid.toggle_display("custom_outer_diameter", true);
//     }

//     else if (type === "Forgings") {
//         grid.toggle_display("custom_length", true);
//         grid.toggle_display("custom_outer_diameter", true);
//         grid.toggle_display("custom_wall_thickness", true);
//     }

//     frm.refresh_field("items");
// }

// function calculate_kgs(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
//     const type = row.custom_item_group;

//     const density = flt(row.custom_density) || 0;
//     const π = Math.PI;
//     let base_weight = 0;

//     if (type === "Plates") {
//         const L = flt(row.custom_length);
//         const W = flt(row.custom_width);
//         const T = flt(row.custom_thickness);
//         if (L && W && T && density)
//             base_weight = (L * W * T * density) / 1_000_000;
//     }

//     else if (["Tubes", "Pipes"].includes(type)) {
//         const L = flt(row.custom_length);
//         const OD = flt(row.custom_outer_diameter);
//         const WT = flt(row.custom_wall_thickness);
//         if (OD && WT && L && density) {
//             const R = OD / 2;
//             const r = R - WT;
//             base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
//         }
//     }

//     else if (["Flanges", "Rings"].includes(type)) {
//         const OD = flt(row.custom_outer_diameter);
//         const ID = flt(row.custom_inner_diameter);
//         const T = flt(row.custom_thickness);
//         if (OD && ID && T && density) {
//             const R = OD / 2;
//             const r = ID / 2;
//             base_weight = (π * (R**2 - r**2) * T * density) / 1_000_000;
//         }
//     }

//     else if (type === "Rods") {
//         const L = flt(row.custom_length);
//         const D = flt(row.custom_outer_diameter);
//         if (L && D && density) {
//             const R = D / 2;
//             base_weight = (π * (R**2) * L * density) / 1_000_000;
//         }
//     }

//     else if (type === "Forgings") {
//         const L = flt(row.custom_length);
//         const OD = flt(row.custom_outer_diameter);
//         const WT = flt(row.custom_wall_thickness);
//         if (L && OD && WT && density) {
//             const R = OD / 2;
//             const r = Math.max(R - WT, 0);
//             base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
//         }
//     }

//     frappe.model.set_value(cdt, cdn, "custom_base_weight", flt(base_weight, 4));

//     const qty = flt(row.qty) || 0;
//     frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(qty * base_weight, 2));
//     frappe.model.set_value(cdt, cdn, "uom", "Kg");

//     frm.refresh_field("items");
// }



frappe.ui.form.on("BOM Item", {

    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        frappe.db.get_value("Item", row.item_code,
            ["item_name", "item_group", "default_bom"],
            (r) => {
                if (!r) return;

                if (r.item_group) {
                    frappe.model.set_value(cdt, cdn, "custom_item_group", r.item_group);
                }

                if (r.default_bom) {
                    frappe.model.set_value(cdt, cdn, "bom_no", r.default_bom);
                }

                toggle_fields(frm, cdt, cdn);
                calculate_kgs(frm, cdt, cdn);
            }
        );
    },

    custom_item_group(frm, cdt, cdn) {
        toggle_fields(frm, cdt, cdn);
        calculate_kgs(frm, cdt, cdn);
    },

    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,
    custom_outer_diameter: calculate_kgs,
    custom_inner_diameter: calculate_kgs,
    custom_wall_thickness: calculate_kgs,
    custom_density: calculate_kgs,

    custom_kilogramskgs(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const manual_groups = ["Fasteners", "Gaskets"];
        if (!manual_groups.includes(row.custom_item_group)) {
            const weight = flt(row.custom_kilogramskgs) || 0;
            frappe.model.set_value(cdt, cdn, "qty", weight);
        }
        frm.refresh_field("items");
    }
});

function toggle_fields(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.custom_item_group;
    const grid = frm.fields_dict["items"].grid;

    const all_fields = [
        "custom_length",
        "custom_width",
        "custom_thickness",
        "custom_outer_diameter",
        "custom_inner_diameter",
        "custom_wall_thickness",
    ];

    const manual_groups = ["Fasteners", "Gaskets"];
    all_fields.forEach(f => grid.toggle_display(f, false));

    if (manual_groups.includes(type)) {
        grid.toggle_display("custom_kilogramskgs", true); 
        frm.refresh_field("items");
        return;
    }

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
    const density = flt(row.custom_density) || 0;
    const π = Math.PI;
    let base_weight = 0;

    if (type === "Plates") {
        const L = flt(row.custom_length);
        const W = flt(row.custom_width);
        const T = flt(row.custom_thickness);
        if (L && W && T && density) base_weight = (L * W * T * density) / 1_000_000;
    }
    else if (["Tubes", "Pipes"].includes(type)) {
        const L = flt(row.custom_length);
        const OD = flt(row.custom_outer_diameter);
        const WT = flt(row.custom_wall_thickness);
        if (OD && WT && L && density) {
            const R = OD / 2;
            const r = R - WT;
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }
    else if (["Flanges", "Rings"].includes(type)) {
        const OD = flt(row.custom_outer_diameter);
        const ID = flt(row.custom_inner_diameter);
        const T = flt(row.custom_thickness);
        if (OD && ID && T && density) {
            const R = OD / 2;
            const r = ID / 2;
            base_weight = (π * (R**2 - r**2) * T * density) / 1_000_000;
        }
    }
    else if (type === "Rods") {
        const L = flt(row.custom_length);
        const D = flt(row.custom_outer_diameter);
        if (L && D && density) {
            const R = D / 2;
            base_weight = (π * (R**2) * L * density) / 1_000_000;
        }
    }
    else if (type === "Forgings") {
        const L = flt(row.custom_length);
        const OD = flt(row.custom_outer_diameter);
        const WT = flt(row.custom_wall_thickness);
        if (L && OD && WT && density) {
            const R = OD / 2;
            const r = Math.max(R - WT, 0);
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }

    frappe.model.set_value(cdt, cdn, "custom_base_weight", flt(base_weight, 4));

    if (!["Fasteners", "Gaskets"].includes(type)) {
        const qty = flt(row.qty) || 0;
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(qty * base_weight, 2));
        frappe.model.set_value(cdt, cdn, "uom", "Kg");
    }

    frm.refresh_field("items");
}
