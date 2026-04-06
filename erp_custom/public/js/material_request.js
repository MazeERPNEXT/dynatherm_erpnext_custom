
frappe.ui.form.on("Material Request", {
    after_save(frm) {},

    refresh(frm) {
        if (frm.doc.docstatus !== 0) return;

        frm.add_custom_button(
            __("Cutting Plan"),
            function () {
                open_cutting_plan_dialog(frm);
            },
            __("Get Items From") 
        );
    
        override_bom_fetch(frm);
    }
});

function override_bom_fetch(frm) {
    const original = frm.events.get_items_from_bom;

    if (!original || frm.__bom_patched) return;

    frm.__bom_patched = true;

    frm.events.get_items_from_bom = function (frm) {

        let d = new frappe.ui.Dialog({
            title: __("Get Items from BOM"),
            fields: [
                {
                    fieldname: "bom",
                    fieldtype: "Link",
                    label: __("BOM"),
                    options: "BOM",
                    reqd: 1
                },
                {
                    fieldname: "warehouse",
                    fieldtype: "Link",
                    label: __("Warehouse"),
                    options: "Warehouse",
                    reqd: 1
                },
                {
                    fieldname: "qty",
                    fieldtype: "Float",
                    label: __("Qty"),
                    default: 1,
                    reqd: 1
                },
                {
                    fieldname: "fetch_exploded",
                    fieldtype: "Check",
                    label: __("Exploded"),
                    default: 1
                }
            ],

            primary_action_label: __("Get Items"),

            primary_action(values) {

                frappe.call({
                    method: "erp_custom.erp_custom.overrides.material_request.get_bom_items_custom",
                    args: {
                        ...values,
                        company: frm.doc.company
                    },
                    callback(r) {

                        if (!r.message) return;

                        erpnext.utils.remove_empty_first_row(frm, "items");

                        r.message.forEach(item => {

                            let row = frm.add_child("items");

                            row.item_code = item.item_code;
                            row.item_name = item.item_name;
                            row.description = item.description;
                            row.uom = item.stock_uom;
                            row.stock_uom = item.stock_uom;
                            row.qty = item.qty;
                            row.warehouse = values.warehouse;

                            // ✅ SAFE ASSIGN (NO undefined)
                            row.item_group = item.item_group || "";

                            row.custom_length = item.custom_length || 0;
                            row.custom_width = item.custom_width || 0;
                            row.custom_thickness = item.custom_thickness || 0;
                            row.custom_density = item.custom_density || 0;

                            row.custom_outer_diameter = item.custom_outer_diameter || 0;
                            row.custom_inner_diameter = item.custom_inner_diameter || 0;
                            row.custom_wall_thickness = item.custom_wall_thickness || 0;

                            row.custom_kilogramskgs = item.custom_kilogramskgs || 0;
                            row.custom_total_weight = item.custom_total_weight || 0;
                        });

                        frm.refresh_field("items");
                    }
                });
            }
        });

        d.show();
    };
}


// frappe.ui.form.on("Material Request", {
//     refresh(frm) {
//         if (frm.doc.docstatus !== 0) return;

//         frm.add_custom_button(
//             __("Cutting Plan"),
//             function () {
//                 open_cutting_plan_dialog(frm);
//             },
//             __("Get Items From") 
//         );
//     }
// });

function open_cutting_plan_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: "Get Items from Cutting Plan",
        fields: [
            {
                label: "Cutting Plan",
                fieldname: "cutting_plan",
                fieldtype: "Link",
                options: "Cutting Plan",
                reqd: 1
            }
        ],
        primary_action_label: "Get Items",
        primary_action(values) {

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Cutting Plan",
                    name: values.cutting_plan
                },
                callback: function (r) {

                    if (!r.message) {
                        frappe.msgprint("No Cutting Plan found");
                        return;
                    }

                    let doc = r.message;
                    let items = doc.cutting_plan_plate_details || [];

                    if (!items.length) {
                        frappe.msgprint("No Plate Details found in Cutting Plan");
                        return;
                    }

                    // FIX: remove only default empty row
                    if (frm.doc.items && frm.doc.items.length === 1 && !frm.doc.items[0].item_code) {
                        frm.clear_table("items");
                    }

                    items.forEach(cp => {
                        let row = frm.add_child("items");

                        row.item_code = cp.item_code;
                        row.item_name = cp.item_name;
                        row.item_group = cp.item_group;
                        row.qty = cp.qty || cp.required_qty || 1;
                        row.uom = cp.uom;
                        row.custom_length = cp.length || 0;
                        row.custom_width = cp.width || 0;
                        row.custom_thickness = cp.thickness || 0;
                    });

                    frm.refresh_field("items");

                    frappe.msgprint("Items fetched from Cutting Plan");
                    d.hide();
                }
            });
        }
    });

    d.show();
}


frappe.ui.form.on("Material Request Item", {
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

            frappe.model.set_value(cdt, cdn, "item_group", item.item_group || "");
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

    custom_material_type(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.custom_material_type) return;

        // Fetch material_value (density) from Material Type doctype
        frappe.db.get_value("Material Type", row.custom_material_type,
            ["material_value"]).then(r => {
            if (!r || !r.message) return;

            frappe.model.set_value(cdt, cdn, "custom_density", r.message.material_value || 0);
            calculate_kgs(frm, cdt, cdn);
        });
    },

    // =========================================================
    // TRIGGERS
    // =========================================================
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


// =========================================================
// WEIGHT CALCULATION (Kg per unit)
// =========================================================
function calculate_kgs(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const type = row.item_group;
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
        base_weight =
            (flt(row.custom_length) *
             flt(row.custom_width) *
             flt(row.custom_thickness) *
             density) / 1_000_000;
    }

    else if (["Tubes", "Pipes"].includes(type)) {
        const R = flt(row.custom_outer_diameter) / 2;
        const r = Math.max(R - flt(row.custom_wall_thickness), 0);
        base_weight =
            (π * (R ** 2 - r ** 2) *
             flt(row.custom_length) *
             density) / 1_000_000;
    }

    else if (["Flanges", "Rings"].includes(type)) {
        base_weight =
            (π *
            ((flt(row.custom_outer_diameter) / 2) ** 2 -
             (flt(row.custom_inner_diameter) / 2) ** 2) *
             flt(row.custom_thickness) *
             density) / 1_000_000;
    }

    else if (type === "Rods") {
        base_weight =
            (π *
            (flt(row.custom_outer_diameter) / 2) ** 2 *
            flt(row.custom_length) *
            density) / 1_000_000;
    }

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


// =========================================================
// TOTAL WEIGHT = Qty × Kg
// =========================================================
function calculate_total_weight(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    const total_weight = flt(row.qty) * flt(row.custom_kilogramskgs);

    frappe.model.set_value(cdt, cdn, "custom_total_weight", flt(total_weight, 4));

    calculate_custom_amount(frm, cdt, cdn);
    calculate_scrap_and_transport(frm, cdt, cdn);
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

    frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kg", flt(scrap_kgs, 4));
    frappe.model.set_value(cdt, cdn, "custom_transportation_cost_", flt(transport_cost, 2));
}
