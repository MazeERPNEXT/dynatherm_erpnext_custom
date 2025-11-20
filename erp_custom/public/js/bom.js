// -------------------------------------------
// BOM ITEM – AUTO FETCH ITEM GROUP & DEFAULT BOM
// -------------------------------------------
frappe.ui.form.on("BOM Item", {

    // On Item select → fetch item_group + default_bom
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.item_code) return;

        frappe.db.get_value("Item", row.item_code,
            ["item_group", "default_bom"],
            (r) => {
                if (!r) return;

                // ✅ Set Item Group
                if (r.item_group) {
                    frappe.model.set_value(cdt, cdn, "custom_item_group", r.item_group);
                }

                // ✅ Set Default BOM from Item (if needed in your table)
                if (r.default_bom) {
                    frappe.model.set_value(cdt, cdn, "bom_no", r.default_bom);
                }

                toggle_fields(frm, cdt, cdn);
                calculate_kgs(frm, cdt, cdn);
            }
        );
    },

    // If user changes Item Group manually
    custom_item_group(frm, cdt, cdn) {
        toggle_fields(frm, cdt, cdn);
        calculate_kgs(frm, cdt, cdn);
    },

    // Recalculate for every dimension field change
    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,

    custom_outer_diameter: calculate_kgs,
    custom_inner_diameter: calculate_kgs,
    custom_wall_thickness: calculate_kgs,

    custom_density: calculate_kgs,

    // Qty change → update final weight
    qty(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const qty = flt(row.qty) || 0;
        const base = flt(row.custom_base_weight) || 0;
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(qty * base, 2));
    }
});

// -------------------------------------------
// SHOW / HIDE DIMENSION FIELDS BASED ON ITEM GROUP
// -------------------------------------------
function toggle_fields(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const grid = frm.fields_dict["items"].grid;

    const type = row.custom_item_group;

    const all_fields = [
        "custom_length",
        "custom_width",
        "custom_thickness",
        "custom_outer_diameter",
        "custom_inner_diameter",
        "custom_wall_thickness",
    ];

    // Item groups that need ONLY qty (manual entry)
    const manual_groups = ["Fasters", "Gaskets"];

    all_fields.forEach(f => grid.toggle_display(f, false));

    // Manual entry groups (no dimensions)
    if (manual_groups.includes(type)) {
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

// -------------------------------------------
// WEIGHT CALCULATION
// -------------------------------------------
function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.custom_item_group;
    const density = flt(row.custom_density) || 0;

    const π = Math.PI;
    let base_weight = 0;

    // ---- Plates ----
    if (type === "Plates") {
        const L = flt(row.custom_length);
        const W = flt(row.custom_width);
        const T = flt(row.custom_thickness);
        if (L && W && T && density)
            base_weight = (L * W * T * density) / 1_000_000;
    }

    // ---- Tubes / Pipes ----
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

    // ---- Flanges / Rings ----
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

    // ---- Rods ----
    else if (type === "Rods") {
        const L = flt(row.custom_length);
        const D = flt(row.custom_outer_diameter);
        if (L && D && density) {
            const R = D / 2;
            base_weight = (π * (R**2) * L * density) / 1_000_000;
        }
    }

    // ---- Forgings ----
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

    // Save Base + Total Weight
    frappe.model.set_value(cdt, cdn, "custom_base_weight", flt(base_weight, 4));
    frappe.model.set_value(
        cdt, cdn,
        "custom_kilogramskgs",
        flt(base_weight * (flt(row.qty) || 1), 2)
    );

    frappe.model.set_value(cdt, cdn, "uom", "Kg");

    frm.refresh_field("items");
}
