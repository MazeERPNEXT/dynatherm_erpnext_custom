
frappe.ui.form.on("BOM", {
    refresh(frm) {
        hide_index(frm);
                if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__("Cutting Plan"), () => {
                frappe.new_doc("Cutting Plan", {
                    bom: frm.doc.name,
                    company: frm.doc.company
                }, (doc) => {

                    // Ensure child table is clean
                    doc.cutting_plan_plate_details = [];
                    (frm.doc.items || []).forEach(row => {

                        let child = frappe.model.add_child(
                            doc,
                            "Cutting Plan Plate Details",
                            "cutting_plan_plate_details"
                        );

                        // ✅ STANDARD FIELDS
                        frappe.model.set_value(child.doctype, child.name, "item_code", row.item_code);
                        frappe.model.set_value(child.doctype, child.name, "qty", row.qty);
                        frappe.model.set_value(child.doctype, child.name, "uom", row.uom);
                        frappe.model.set_value(child.doctype, child.name, "description", row.description);
                        frappe.model.set_value(child.doctype, child.name, "length", row.custom_length);
                        frappe.model.set_value(child.doctype, child.name, "width", row.custom_width);
                        frappe.model.set_value(child.doctype, child.name, "thickness", row.custom_thickness);

                        // ✅ MAP JOB NO (IMPORTANT FOR YOUR LOGIC)
                        if (row.custom_job_no) {
                            frappe.model.set_value(child.doctype, child.name, "job_no", row.custom_job_no);
                        }

                    });

                    frappe.after_ajax(() => {
                        cur_frm.refresh_field("cutting_plan_plate_details");
                    });
                });
            }, __("Create"));
        }

        // 🔹 Material Request (L: MR | R: BOM)
            frm.add_custom_button(__("Material Request"), () => {

                let mr = frappe.model.get_new_doc("Material Request");

                mr.material_request_type = "Purchase";
                mr.company = frm.doc.company;

                (frm.doc.items || []).forEach(row => {

                    let item = frappe.model.add_child(mr, "Material Request Item", "items");

                    item.item_code = row.item_code;
                    item.item_name = row.item_name;
                    item.item_group = row.custom_item_group;
                    item.description = row.description;
                    item.qty = row.qty;
                    item.uom = row.uom;

                    // Custom fields
                    item.custom_density = row.custom_density;
                    item.custom_inner_diameter = row.custom_inner_diameter;
                    item.custom_outer_diameter = row.custom_outer_diameter;
                    item.custom_thickness = row.custom_thickness;
                    item.custom_length = row.custom_length;
                    item.custom_width = row.custom_width;
                    item.custom_wall_thickness = row.custom_wall_thickness;

                    item.custom_kilogramskgs = row.custom_kilogramskgs;
                    item.custom_total_weight = row.custom_total_weight;

                    // item.custom_rate_inr = row.custom_rate_inr;
                    item.custom_last_purchase_price = row.custom_last_purchase_price;

                    item.custom_material_type = row.custom_material_type;
                    item.custom_raw_material_type = row.custom_raw_material_type;
                    item.custom_item_group = row.custom_item_group;

                    item.custom_scrap_margin_kg = row.custom_scrap_margin_kgs;
                    item.custom_scrap_margin_percentage = row.custom_scrap_margin_percentage;

                    item.custom_transportation_cost = row.custom_transportation_cost;
                    item.custom_transportation_cost_ = row.custom_transportation_cost_kgs;

                });

                frappe.set_route("Form", "Material Request", mr.name);
            }, __("Create"));  

    }
});


frappe.ui.form.on("BOM Item", {
    
    custom_rate_per_kg: update_rate_from_weight,
    custom_total_weight: update_rate_from_weight,
    qty: update_rate_from_weight,
    item_code(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    // If item removed → clear dependent fields
    if (!row.item_code) {
        frappe.model.set_value(cdt, cdn, "item_name", "");
        frappe.model.set_value(cdt, cdn, "custom_item_group", "");
        frappe.model.set_value(cdt, cdn, "bom_no", "");
        frappe.model.set_value(cdt, cdn, "custom_material_type", "");
        frappe.model.set_value(cdt, cdn, "custom_density", 0);
        frappe.model.set_value(cdt, cdn, "custom_thickness", 0);
        frappe.model.set_value(cdt, cdn, "custom_last_purchase_price", 0);
        return;
    }

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

    // ---- Last Purchase Price
    // frappe.db.get_list("Item Price", {
    //     filters: { item_code: row.item_code, buying: 1 },
    //     fields: ["price_list_rate"],
    //     order_by: "modified desc",
    //     limit: 1
    // }).then(res => {
    //     const rate = res?.length ? res[0].price_list_rate : 0;
    //     frappe.model.set_value(cdt, cdn, "custom_last_purchase_price", rate);
    // });

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Item Price",
            filters: {
                item_code: row.item_code,
                buying: 1
            },
            fields: ["price_list_rate", "price_list"],
            order_by: "modified desc",
            limit_page_length: 1
        },
        callback: function(r) {
            let rate = 0;
            if (r.message && r.message.length) {
                rate = flt(r.message[0].price_list_rate);
            }

            // console.log("Item Price Fetch:", row.item_code, rate);

            frappe.model.set_value(cdt, cdn, "custom_last_purchase_price", rate);
        }
    });
    },

    // =========================================================
    // TRIGGERS
    // =========================================================
    qty: calculate_total_weight,
    rate: calculate_custom_amount,

    custom_item_group: calculate_kgs,
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


// =========================================================
// WEIGHT CALCULATION (Kg per unit)
// =========================================================
function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.custom_item_group;
    const density = flt(row.custom_density) || 0;
    const π = Math.PI;

    let base_weight = 0;

    if (!density) {
        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", 0);
        frappe.model.set_value(cdt, cdn, "custom_total_weight", 0);
        frappe.model.set_value(cdt, cdn, "custom_amount_inr", 0);
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


// =========================================================
// TOTAL WEIGHT = Qty × Kg
// =========================================================
function calculate_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const total_weight = flt(row.qty) * flt(row.custom_kilogramskgs);

    frappe.model.set_value(cdt, cdn, "custom_total_weight", flt(total_weight, 4));

    calculate_custom_amount(frm, cdt, cdn);
    calculate_scrap_and_transport(frm, cdt, cdn);
    update_rate_from_weight(frm, cdt, cdn);
}


// =========================================================
// CUSTOM AMOUNT (₹) = Rate × Total Weight
// =========================================================
function calculate_custom_amount(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const qty = flt(row.qty) || 0;
    const rate = flt(row.rate) || 0;
    const total_weight = flt(row.custom_total_weight) || 0;

    frappe.model.set_value(cdt, cdn, "custom_amount_inr", flt(rate * total_weight, 2));
    // frappe.model.set_value(cdt, cdn, "amount", flt(qty * rate * total_weight, 2));
}


// =========================================================
// SCRAP & TRANSPORTATION
// =========================================================
function calculate_scrap_and_transport(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const total_weight = flt(row.custom_total_weight) || 0;
    const scrap_pct = flt(row.custom_scrap_margin_percentage) || 0;
    const transport_rate = flt(row.custom_transportation_cost) || 0;

    const scrap_kgs = total_weight * (scrap_pct / 100);
    const transport_cost = total_weight * transport_rate;

    frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kgs", flt(scrap_kgs, 4));
    frappe.model.set_value(cdt, cdn, "custom_transportation_cost_kgs", flt(transport_cost, 2));
}


function update_rate_from_weight(frm, cdt, cdn) {

    const row = locals[cdt][cdn];

    const rate_per_kg = flt(row.custom_rate_per_kg);
    const total_weight = flt(row.custom_total_weight);
    const qty = flt(row.qty) || 1;

    if (!rate_per_kg || !total_weight) return;

    const new_rate = rate_per_kg * total_weight;

    // ✅ SET RATE
    row.rate = flt(new_rate, 2);
    row.base_rate = row.rate;

    const amount = qty * row.rate;

    row.amount = flt(amount, 2);
    row.base_amount = row.amount;

    frm.refresh_field("items");
}
//=================
//ITEMS TABLE LOGIC UI hide_index
//=================
function hide_index(frm) {
    setTimeout(() => {
        let $wrapper = $(frm.fields_dict['items'].grid.wrapper);
        $wrapper.find('.grid-heading-row .row-index').hide();
        $wrapper.find('.row-index').hide();
    }, 200);
}
// =========================================================
// FORCE RATE OVERRIDE (SERVER CONFIRMED)
// =========================================================
// function force_rate_override(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
//     if (!row.item_code || !frm.doc.name) return;

//     frappe.call({
//         method: "erp_custom.erp_custom.overrides.bom.get_bom_material_detail",
//         args: {
//             bom: frm.doc.name,
//             item_code: row.item_code,
//             custom_total_weight: row.custom_total_weight
//         },
//         callback(r) {
//             if (r.message === undefined || r.message === null) return;

//             frappe.model.set_value(cdt, cdn, "rate", flt(r.message));
//         }
//     });
// }

// frappe.ui.form.on("BOM Item", {
//     item_code: call_bom_backend,
//     qty: update_amount,
//     rate: update_amount,
//     custom_length: call_bom_backend,
//     custom_width: call_bom_backend,
//     custom_thickness: call_bom_backend,
//     custom_outer_diameter: call_bom_backend,
//     custom_inner_diameter: call_bom_backend,
//     custom_wall_thickness: call_bom_backend,
//     custom_density: call_bom_backend,
//     custom_total_weight: update_amount,
//     custom_scrap_margin_percentage: call_bom_backend,
//     custom_transportation_cost: call_bom_backend
// });

// function call_bom_backend(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
//     if (!row.item_code) return;

//     frappe.call({
//         method: "erp_custom.erp_custom.overrides.bom.calculate_bom_item",
//         args: { row },
//         callback(r) {
//             if (!r.message) return;

//             Object.entries(r.message).forEach(([field, value]) => {
//                 if (row[field] !== value) {
//                     frappe.model.set_value(cdt, cdn, field, value);
//                 }
//             });

//             // Recalculate amount after backend values
//             update_amount(frm, cdt, cdn);
//         }
//     });
// }

// function update_amount(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];
//     const qty = flt(row.qty);
//     const rate = flt(row.rate);
//     const total_weight = flt(row.custom_total_weight);

//     // Amount calculation
//     const amount = flt(qty * rate * total_weight, 2);
//     frappe.model.set_value(cdt, cdn, 'amount', amount);
//     frappe.model.set_value(cdt, cdn, 'base_amount', flt(amount * frm.doc.conversion_rate, 2));

//     // Update BOM totals live
//     let total_rm = 0;
//     (frm.doc.items || []).forEach(d => total_rm += flt(d.amount));
//     frm.set_value('raw_material_cost', total_rm);
//     frm.set_value('base_raw_material_cost', flt(total_rm * frm.doc.conversion_rate, 2));

//     const total_cost = flt(frm.doc.operating_cost) + total_rm - flt(frm.doc.scrap_material_cost || 0);
//     frm.set_value('total_cost', total_cost);
//     frm.set_value('base_total_cost', flt(total_cost * frm.doc.conversion_rate, 2));
// }
