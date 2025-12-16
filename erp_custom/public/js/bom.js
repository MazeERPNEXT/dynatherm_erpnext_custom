frappe.ui.form.on("BOM Item", {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        // 1️⃣ ITEM MASTER
        frappe.db.get_value(
            "Item",
            row.item_code,
            ["item_group", "default_bom", "custom_material_type", "custom_density"]
        ).then(r => {
            if (!r || !r.message) return;

            const item = r.message;

            frappe.model.set_value(cdt, cdn, "custom_item_group", item.item_group || "");
            frappe.model.set_value(cdt, cdn, "bom_no", item.default_bom || "");
            frappe.model.set_value(cdt, cdn, "custom_material_type", item.custom_material_type || "");
            frappe.model.set_value(cdt, cdn, "custom_density", item.custom_density || 0);

            calculate_kgs(frm, cdt, cdn);
        });

        // 2️⃣ LAST PURCHASE PRICE
        frappe.db.get_list("Item Price", {
            filters: { item_code: row.item_code, buying: 1 },
            fields: ["price_list_rate"],
            order_by: "modified desc",
            limit: 1
        }).then(res => {
            const rate = res?.length ? res[0].price_list_rate : 0;
            frappe.model.set_value(cdt, cdn, "custom_last_purchase_price", rate);
        });
    },

    // =========================================================
    // MATERIAL TYPE CHANGE
    // =========================================================
    custom_material_type(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code || !row.custom_material_type) return;

        frappe.db.get_value(
            "Item",
            row.item_code,
            ["custom_material_type", "custom_density"]
        ).then(r => {
            if (!r || !r.message) return;

            const item = r.message;

            frappe.model.set_value(
                cdt,
                cdn,
                "custom_density",
                item.custom_material_type === row.custom_material_type
                    ? (item.custom_density || 0)
                    : 0
            );

            calculate_kgs(frm, cdt, cdn);
        });
    },

    // =========================================================
    // QTY CHANGE  ✅ THIS WAS MISSING
    // =========================================================
    qty(frm, cdt, cdn) {
        calculate_total_weight(frm, cdt, cdn);
    },

    // =========================================================
    // WEIGHT TRIGGERS
    // =========================================================
    custom_item_group: calculate_kgs,
    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,
    custom_outer_diameter: calculate_kgs,
    custom_inner_diameter: calculate_kgs,
    custom_wall_thickness: calculate_kgs,
    custom_density: calculate_kgs
});

function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.custom_item_group;
    const density = flt(row.custom_density) || 0;

    let base_weight = 0;
    const π = Math.PI;

    if (!density) {
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
        frappe.model.set_value(cdt, cdn, "custom_total_weight", 0);
        return;
    }

    if (type === "Plates") {
        const L = flt(row.custom_length);
        const W = flt(row.custom_width);
        const T = flt(row.custom_thickness);
        if (L && W && T) {
            base_weight = (L * W * T * density) / 1_000_000;
        }
    }

    else if (["Tubes", "Pipes"].includes(type)) {
        const L = flt(row.custom_length);
        const OD = flt(row.custom_outer_diameter);
        const WT = flt(row.custom_wall_thickness);
        if (L && OD && WT) {
            const R = OD / 2;
            const r = Math.max(R - WT, 0);
            base_weight = (π * (R**2 - r**2) * L * density) / 1_000_000;
        }
    }

    else if (["Flanges", "Rings"].includes(type)) {
        const OD = flt(row.custom_outer_diameter);
        const ID = flt(row.custom_inner_diameter);
        const T = flt(row.custom_thickness);
        if (OD && ID && T) {
            base_weight = (π * ((OD/2)**2 - (ID/2)**2) * T * density) / 1_000_000;
        }
    }

    else if (type === "Rods") {
        const L = flt(row.custom_length);
        const D = flt(row.custom_outer_diameter);
        if (L && D) {
            base_weight = (π * (D/2)**2 * L * density) / 1_000_000;
        }
    }

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

    const kg_per_unit = flt(base_weight, 4);

    frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", kg_per_unit);

    // 🔑 ALWAYS UPDATE TOTAL AFTER KG
    calculate_total_weight(frm, cdt, cdn);
}

function calculate_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const qty = flt(row.qty) || 0;
    const kg = flt(row.custom_kilogramskgs) || 0;

    frappe.model.set_value(
        cdt,
        cdn,
        "custom_total_weight",
        flt(qty * kg, 4)
    );

    frm.refresh_field("items");
}
