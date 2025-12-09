frappe.ui.form.on("BOM Item", {

    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        frappe.db.get_value("Item", row.item_code,
            ["item_name", "item_group", "default_bom", "custom_material_type", "custom_density"],
            (r) => {
                if (!r) return;

                // existing logic
                if (r.item_group) {
                    frappe.model.set_value(cdt, cdn, "custom_item_group", r.item_group);
                }

                if (r.default_bom) {
                    frappe.model.set_value(cdt, cdn, "bom_no", r.default_bom);
                }

                if (r.custom_material_type) {
                    frappe.model.set_value(cdt, cdn, "custom_material_type", r.custom_material_type);
                }

                if (r.custom_density) {
                    frappe.model.set_value(cdt, cdn, "custom_density", r.custom_density);
                }

                calculate_kgs(frm, cdt, cdn);
            }
        );
    },


    // NEW: Re-fetch density if user changes material type manually
    custom_material_type(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code || !row.custom_material_type) return;

        frappe.db.get_value(
            "Item",
            row.item_code,
            ["custom_material_type", "custom_density"]
        ).then(r => {
            const item = r.message;

            // Only update if material matches item master
            if (item.custom_material_type === row.custom_material_type) {
                frappe.model.set_value(cdt, cdn, "custom_density", item.custom_density);
            } else {
                frappe.model.set_value(cdt, cdn, "custom_density", 0);
            }

            calculate_kgs(frm, cdt, cdn);
        });
    },


    // existing weight recalculation triggers
    custom_item_group: calculate_kgs,
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
            frappe.model.set_value(cdt, cdn, "custom_base_weight", weight);
        }

        frm.refresh_field("items");
    }
});

// ----------------------------------------------------
// FINAL — CORRECT WEIGHT CALCULATION (no double update)
// ----------------------------------------------------
function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.custom_item_group;

    const density = flt(row.custom_density) || 0;
    if (!density) {
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
        return;
    }

    const π = Math.PI;
    let base_weight = 0;

    // ------------------------
    // PLATES
    // ------------------------
    if (type === "Plates") {
        const L = flt(row.custom_length);
        const W = flt(row.custom_width);
        const T = flt(row.custom_thickness);

        if (L && W && T) {
            base_weight = (L * W * T * density) / 1_000_000;
        }
    }

    // ------------------------
    // TUBES / PIPES
    // ------------------------
    else if (["Tubes"].includes(type)) {
        const L = flt(row.custom_length);
        const OD = flt(row.custom_outer_diameter);
        const WT = flt(row.custom_wall_thickness);

        if (L && OD && WT) {
            const R = OD / 2;
            const r = Math.max(R - WT, 0);
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }

    else if (["Pipes"].includes(type)) {
        const L = flt(row.custom_length);
        const OD = flt(row.custom_outer_diameter);
        const WT = flt(row.custom_wall_thickness);

        if (L && OD && WT) {
            const R = OD / 2;
            const r = Math.max(R - WT, 0);
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }

    // ------------------------
    // FLANGES / RINGS
    // ------------------------
    else if (["Flanges", "Rings"].includes(type)) {
        const OD = flt(row.custom_outer_diameter);
        const ID = flt(row.custom_inner_diameter);
        const T = flt(row.custom_thickness);

        if (OD && ID && T) {
            const R = OD / 2;
            const r = ID / 2;
            base_weight = (π * (R**2 - r**2) * T * density) / 1_000_000;
        }
    }

    // ------------------------
    // RODS
    // ------------------------
    else if (type === "Rods") {
        const L = flt(row.custom_length);
        const D = flt(row.custom_outer_diameter);

        if (L && D) {
            const R = D / 2;
            base_weight = (π * R**2 * L * density) / 1_000_000;
        }
    }

    // ------------------------
    // FORGINGS (SOLID OR HOLLOW)
    // ------------------------
    else if (type === "Forgings") {
        const L = flt(row.custom_length);
        const OD = flt(row.custom_outer_diameter);
        const WT = flt(row.custom_wall_thickness);

        if (L && OD && WT) {
            const R = OD / 2;
            const r = Math.max(R - WT, 0);
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }

    // ----------------------------------------------------
    // FINAL WEIGHT SETTING — FIXED (NO DOUBLE CALCULATION)
    // ----------------------------------------------------
    const final_weight = flt(base_weight, 4);

    frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", final_weight);
    frappe.model.set_value(cdt, cdn, "uom", "Kg");

    frm.refresh_field("items");
}
