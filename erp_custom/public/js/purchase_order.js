// frappe.ui.form.on("Purchase Order", {
//     refresh(frm) {
//         frm.set_query("supplier", () => {
//             return {
//                 filters: {
//                     workflow_state: "Approved"
//                 }
//             };
//         });

//         setTimeout(() => {
//             let f = frm.fields_dict["supplier"];
//             if (f && f.df) {
//                 f.df.get_query = function () {
//                     return {
//                         filters: {
//                             workflow_state: "Approved"
//                         }
//                     };
//                 };
//             }
//         }, 0);
//     }
// });



frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        // Filter for Supplier (already working for you)
        frm.set_query("supplier", () => {
            return {
                filters: { workflow_state: "Approved" }
            };
        });

        // Filter for Item Code inside the child table
        frm.fields_dict["items"].grid.get_field("item_code").get_query = function (doc, cdt, cdn) {
            return {
                filters: {
                    workflow_state: "Approved",
                    is_purchase_item: 1,  
                    has_variants: 0    
                }
            };
        };
    }
});



// ----------------------------------------------------
// ------------ PURCHASE ORDER ITEM -------------------
// ----------------------------------------------------
frappe.ui.form.on("Purchase Order Item", {

        item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        // ---- Fetch from Item Master
        frappe.db.get_value(
            "Item",
            row.item_code,
            ["item_group", "default_bom", "custom_material_type", "custom_density","custom_thickness"]
        ).then(r => {
            if (!r || !r.message) return;

            const item = r.message;

            frappe.model.set_value(cdt, cdn, "custom_item_group", item.item_group || "");
            frappe.model.set_value(cdt, cdn, "bom_no", item.default_bom || "");
            frappe.model.set_value(cdt, cdn, "custom_material_type", item.custom_material_type || "");
            frappe.model.set_value(cdt, cdn, "custom_density", item.custom_density || 0);
            frappe.model.set_value(cdt, cdn, "custom_thickness", item.custom_thickness || 0);

            calculate_kgs(frm, cdt, cdn);
        });

        // // ---- Last Purchase Price
        // frappe.db.get_list("Item Price", {
        //     filters: { item_code: row.item_code, buying: 1 },
        //     fields: ["price_list_rate"],
        //     order_by: "modified desc",
        //     limit: 1
        // }).then(res => {
        //     const rate = res?.length ? res[0].price_list_rate : 0;
        //     frappe.model.set_value(cdt, cdn, "custom_last_purchase_price", rate);
        // });
    },

    qty: calculate_total_weight,
    rate: calculate_custom_amount,

    item_group: calculate_kgs,
    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,
    custom_outer_diameter: calculate_kgs,
    custom_inner_diameter: calculate_kgs,
    custom_wall_thickness: calculate_kgs,
    custom_density: calculate_kgs,

    custom_scrap_margin_percentage: calculate_scrap_and_transport,
    custom_transportation_cost: calculate_scrap_and_transport
});

// ====================================================
// WEIGHT PER UNIT (Kg)
// ====================================================
function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.item_group;
    const density = flt(row.custom_density) || 0;
    const π = Math.PI;

    let base_weight = 0;

    if (!density) {
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
        frappe.model.set_value(cdt, cdn, "custom_total_weights", 0);
        frappe.model.set_value(cdt, cdn, "custom_amount_inr", 0);
        return;
    }

    // Plates
    if (type === "Plates") {
        base_weight =
            (flt(row.custom_length) *
             flt(row.custom_width) *
             flt(row.custom_thickness) *
             density) / 1_000_000;
    }

    // Tubes / Pipes
    else if (["Tubes", "Pipes"].includes(type)) {
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight =
            (π * (R ** 2 - r ** 2) *
             flt(row.custom_length) *
             density) / 1_000_000;
    }

    // Flanges / Rings
    else if (["Flanges", "Rings"].includes(type)) {
        base_weight =
            (π *
            ((flt(row.custom_outer_diameter) / 2) ** 2 -
             (flt(row.custom_inner_diameter) / 2) ** 2) *
             flt(row.custom_thickness) *
             density) / 1_000_000;
    }

    // Rods
    else if (type === "Rods") {
        base_weight =
            (π *
            (flt(row.custom_outer_diameter) / 2) ** 2 *
            flt(row.custom_length) *
            density) / 1_000_000;
    }

    // Forgings
    else if (type === "Forgings") {
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight =
            (π * (R ** 2 - r ** 2) *
             flt(row.custom_length) *
             density) / 1_000_000;
    }

    frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(base_weight, 4));

    calculate_total_weight(frm, cdt, cdn);
}

// ====================================================
// TOTAL WEIGHT = Qty × Kg
// ====================================================
function calculate_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const total_weight = flt(row.qty) * flt(row.custom_kilogramskgs);

    frappe.model.set_value(cdt, cdn, "custom_total_weights", flt(total_weight, 4));

    calculate_custom_amount(frm, cdt, cdn);
    calculate_scrap_and_transport(frm, cdt, cdn);
}

// ====================================================
// AMOUNT (₹) = Rate × Total Weight
// ====================================================
function calculate_custom_amount(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const rate = flt(row.rate) || 0;
    const total_weight = flt(row.custom_total_weights) || 0;

    frappe.model.set_value(cdt, cdn, "custom_amount_inr", flt(rate * total_weight, 2));
}

// ====================================================
// SCRAP & TRANSPORTATION
// ====================================================
function calculate_scrap_and_transport(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const total_weight = flt(row.custom_total_weights) || 0;
    const scrap_pct = flt(row.custom_scrap_margin_percentage) || 0;
    const transport_rate = flt(row.custom_transportation_cost) || 0;

    const scrap_kgs = total_weight * (scrap_pct / 100);
    const transport_cost = total_weight * transport_rate;

    frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kg", flt(scrap_kgs, 4));

    frappe.model.set_value(cdt, cdn, "custom_transportation_cost_", flt(transport_cost, 2));
}
