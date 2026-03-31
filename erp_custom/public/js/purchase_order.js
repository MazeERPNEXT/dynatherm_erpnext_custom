
// =====================================================
// PURCHASE ORDER (PARENT)
// =====================================================
frappe.ui.form.on("Purchase Order", {

    refresh(frm) {
        calculate_total(frm);
        // sync_fields_from_sq_to_po(frm);
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button("Send Email for Purchase", function () {
                frappe.call({
                    method: "erp_custom.erp_custom.overrides.purchase_order.sent_po_supplier",
                    args: {
                        doc: frm.doc.name  
                    }
                });
            });
        }
    },

    validate(frm) {
        calculate_total(frm);

        return frappe.call({
            method: "erp_custom.erp_custom.overrides.purchase_order.validate_item_workflow",
            args: {
                supplier: frm.doc.supplier
            }
        }).then(r => {

            if (r.message.status === "error") {
                frappe.throw(r.message.message);
            }

            let promises = [];

            (frm.doc.items || []).forEach(row => {
                if (row.item_code) {
                    let p = frappe.call({
                        method: "erp_custom.erp_custom.overrides.purchase_order.validate_item_workflow",
                        args: {
                            item_code: row.item_code
                        }
                    }).then(r => {
                        if (r.message.status === "error") {
                            frappe.throw(r.message.message);
                        }
                    });

                    promises.push(p);
                }
            });

            return Promise.all(promises);
        });
    },
});


// =====================================================
// PURCHASE ORDER ITEM (CHILD)
// =====================================================
frappe.ui.form.on("Purchase Order Item", {
    custom_rate_per_kg(frm, cdt, cdn) {
        calculate_rate_from_weight(frm, cdt, cdn);
        calculate_custom_amount(frm, cdt, cdn);
    },
    amount(frm, cdt, cdn) {
        calculate_total(frm);
    },

    qty(frm, cdt, cdn) {
        calculate_total(frm);
        calculate_total_weight(frm, cdt, cdn);
    },

    rate(frm, cdt, cdn) {
        calculate_total(frm);
        calculate_custom_amount(frm, cdt, cdn);
    },
    items_add(frm) {
        calculate_total(frm);
    },

    items_remove(frm) {
        calculate_total(frm);
    },

    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

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
            toggle_total_field(frm);
        });
    },

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
        return;
    }

    if (type === "Plates") {
        base_weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1_000_000;
    }
    else if (["Tubes", "Pipes"].includes(type)) {
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight = (π * (R ** 2 - r ** 2) * flt(row.custom_length) * density) / 1_000_000;
    }
    else if (["Flanges", "Rings"].includes(type)) {
        base_weight = (π * ((flt(row.custom_outer_diameter) / 2) ** 2 - (flt(row.custom_inner_diameter) / 2) ** 2) * flt(row.custom_thickness) * density) / 1_000_000;
    }
    else if (type === "Rods") {
        base_weight = (π * (flt(row.custom_outer_diameter) / 2) ** 2 * flt(row.custom_length) * density) / 1_000_000;
    }
    else if (type === "Forgings") {
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight = (π * (R ** 2 - r ** 2) * flt(row.custom_length) * density) / 1_000_000;
    }

    frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(base_weight, 4));
    calculate_total_weight(frm, cdt, cdn);
}


// ====================================================
// TOTAL WEIGHT
// ====================================================
function calculate_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const total_weight = flt(row.qty) * flt(row.custom_kilogramskgs);

    frappe.model.set_value(cdt, cdn, "custom_total_weights", flt(total_weight, 4));

    calculate_rate_from_weight(frm, cdt, cdn);
    calculate_custom_amount(frm, cdt, cdn);
    calculate_scrap_and_transport(frm, cdt, cdn);
}


// ====================================================
// AMOUNT
// ====================================================
function calculate_custom_amount(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const qty = flt(row.qty) || 0;
    const rate = flt(row.rate) || 0;
    const amount = qty * rate;

    // ✅ Update standard amount field (IMPORTANT)
    frappe.model.set_value(cdt, cdn, "amount", flt(amount, 2));

    // ✅ Keep your custom field also (no break)
    // frappe.model.set_value(cdt, cdn, "custom_amount_overall_weight_based", flt(amount, 2));

    calculate_total_amount(frm);
}


// ====================================================
// SCRAP & TRANSPORT
// ====================================================
function calculate_scrap_and_transport(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const total_weight = flt(row.custom_total_weights) || 0;
    const scrap_pct = flt(row.custom_scrap_margin_percentage) || 0;
    const transport_rate = flt(row.custom_transportation_cost) || 0;

    frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kg", flt(total_weight * (scrap_pct / 100), 4));
    frappe.model.set_value(cdt, cdn, "custom_transportation_cost_", flt(total_weight * transport_rate, 2));
}



// =====================================================
// RATE CALCULATION (NEW)
// =====================================================
function calculate_rate_from_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const rate_per_kg = flt(row.custom_rate_per_kg) || 0;
    const weight = flt(row.custom_total_weights) || 0;

    if (rate_per_kg && weight) {
        const rate = rate_per_kg * weight;

        frappe.model.set_value(cdt, cdn, "rate", flt(rate, 2));
    }
}


function update_amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    row.amount = (flt(row.qty) * flt(row.rate));

    frm.refresh_field('items');
    calculate_total(frm);
}


// ===============================
// CALCULATE PARENT TOTAL
// ===============================
function calculate_total(frm) {
    let total = 0;

    (frm.doc.items || []).forEach(row => {
        total += flt(row.amount);
    });

    frm.set_value('total', total);
}


// function sync_fields_from_sq_to_po(frm) {

//     if (!frm.doc.items || !frm.doc.items.length) return;

//     (frm.doc.items || []).forEach(row => {

//         if (row.supplier_quotation && row.supplier_quotation_item) {

//             frappe.db.get_value(
//                 "Supplier Quotation Item",
//                 row.supplier_quotation_item,
//                 ["custom_rate_per_kg", "custom_item_brand"]   // ✅ BOTH FIELDS
//             ).then(r => {

//                 if (r && r.message) {

//                     frappe.model.set_value(
//                         row.doctype,
//                         row.name,
//                         "custom_rate_per_kg",
//                         r.message.custom_rate_per_kg || 0
//                     );

//                     frappe.model.set_value(
//                         row.doctype,
//                         row.name,
//                         "custom_item_brand",
//                         r.message.custom_item_brand || ""
//                     );
//                 }
//             });
//         }

//     });

//     frm.refresh_field("items");
// }