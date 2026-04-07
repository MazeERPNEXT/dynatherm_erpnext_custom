// frappe.ui.form.on("Sales Order", {
//     onload(frm) {
//         // ✅ Auto set Financial Year only if empty
//         if (!frm.doc.custom_financial_year) {

//             frappe.call({
//                 method: "erpnext.accounts.utils.get_fiscal_year",
//                 args: {
//                     date: frm.doc.expected_start_date || frappe.datetime.get_today()
//                 },
//                 callback: function(r) {
//                     if (r.message) {
//                         frm.set_value("custom_financial_year", r.message[0]);
//                     }
//                 }
//             });

//         }
//     },
//     refresh(frm) {
//         // Filter for Customer
//         frm.set_query("customer", () => {
//             return {
//                 filters: { workflow_state: "Approved" }
//             };
//         });

//         // Filter inside Items child table for Item Code
//         frm.fields_dict["items"].grid.get_field("item_code").get_query = function (doc, cdt, cdn) {
//             return {
//                 filters: {
//                     workflow_state: "Approved",
//                     is_sales_item: 1,  
//                     has_variants: 0      
//                 }
//             };
//         };
//     }
// });




// frappe.ui.form.on("Sales Order", {

//     refresh(frm) {

//         // ✅ Your existing code (keep as it is)
//         frm.set_query("customer", () => {
//             return {
//                 filters: { workflow_state: "Approved" }
//             };
//         });

//         frm.fields_dict["items"].grid.get_field("item_code").get_query = function (doc, cdt, cdn) {
//             return {
//                 filters: {
//                     workflow_state: "Approved",
//                     is_sales_item: 1,
//                     has_variants: 0
//                 }
//             };
//         };

//         // ✅ Hook into Create → Project
//         frm.page.add_inner_button(__('Project'), function () {

//             // 👉 Use default mapper
//             frappe.model.open_mapped_doc({
//                 method: "erpnext.selling.doctype.sales_order.sales_order.make_project",
//                 frm: frm,
//                 callback: function(project_doc) {

//                     // 🔥 Map certificates here
//                     if (frm.doc.custom_certificate_type && frm.doc.custom_certificate_type.length) {

//                         project_doc.custom_certificates = [];

//                         frm.doc.custom_certificate_type.forEach(row => {
//                             let child = frappe.model.add_child(project_doc, "Project Certificate", "custom_certificates");

//                             child.certificate_type = row.certificate_type;
//                         });
//                     }
//                 }
//             });

//         }, __('Create'));
//     }
// });


// ======================================================
// SALES ORDER
// ======================================================
frappe.ui.form.on("Sales Order", {

    onload(frm) {
        // ✅ Auto set Financial Year
        if (!frm.doc.custom_financial_year) {
            frappe.call({
                method: "erpnext.accounts.utils.get_fiscal_year",
                args: {
                    date: frm.doc.transaction_date || frappe.datetime.get_today()
                },
                callback: function(r) {
                    if (r.message) {
                        frm.set_value("custom_financial_year", r.message[0]);
                    }
                }
            });
        }
    },

    refresh(frm) {

        // ✅ Customer filter
        frm.set_query("customer", () => ({
            filters: { workflow_state: "Approved" }
        }));

        // ✅ Item filter
        frm.fields_dict["items"].grid.get_field("item_code").get_query = () => ({
            filters: {
                workflow_state: "Approved",
                is_sales_item: 1,
                has_variants: 0
            }
        });

        // ✅ Prevent duplicate button
        if (!frm.custom_project_btn_added) {

            frm.add_custom_button(__('Project'), () => {

                // 🔥 Create Project (default ERPNext mapping)
                frappe.model.open_mapped_doc({
                    method: "erpnext.selling.doctype.sales_order.sales_order.make_project",
                    frm: frm
                });

                // 🔥 After Project loads → map certificates
                frappe.after_ajax(() => {

                    let project_frm = cur_frm;

                    // safety check
                    if (!project_frm || project_frm.doctype !== "Project") return;

                    console.log("Mapping certificates...");

                    // ✅ CLEAR existing rows
                    project_frm.clear_table("custom_certificates");

                    // ✅ MAP from Sales Order → Project
                    if (frm.doc.custom_certificate_type?.length) {

                        frm.doc.custom_certificate_type.forEach(row => {

                            let child = project_frm.add_child("custom_certificates");

                            child.certificate_type = row.certificate_type;
                        });

                        project_frm.refresh_field("custom_certificates");
                    }

                });

            }, __('Create'));

            frm.custom_project_btn_added = true;
        }
    }
});

// ======================================================
// SALES ORDER ITEM (FINAL FIX)
// ======================================================
frappe.ui.form.on("Sales Order Item", {

    item_code(frm, cdt, cdn) {

        let row = locals[cdt][cdn];
        if (!row.item_code) return;

        frappe.db.get_value("Item", row.item_code, [
            "item_group",
            "default_bom",
            "custom_density",
            "custom_thickness"
        ]).then(r => {

            if (!r.message) return;

            let item = r.message;

            // ✅ IMPORTANT FIX
            frappe.model.set_value(cdt, cdn, "item_group", item.item_group || "");

            frappe.model.set_value(cdt, cdn, "bom_no", item.default_bom || "");
            frappe.model.set_value(cdt, cdn, "custom_density", item.custom_density || 0);
            frappe.model.set_value(cdt, cdn, "custom_thickness", item.custom_thickness || 0);

            // 🔥 FORCE calculation after load
            setTimeout(() => {
                calculate_kgs(frm, cdt, cdn);
            }, 300);
        });
    },

    qty(frm, cdt, cdn) {
        calculate_total_weight(frm, cdt, cdn);
    },

    rate(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },

    custom_rate_per_kg(frm, cdt, cdn) {
        calculate_rate_from_weight(frm, cdt, cdn);
    },

    // dimension triggers
    custom_length: calculate_kgs,
    custom_width: calculate_kgs,
    custom_thickness: calculate_kgs,
    custom_outer_diameter: calculate_kgs,
    custom_inner_diameter: calculate_kgs,
    custom_wall_thickness: calculate_kgs,
    custom_density: calculate_kgs,

    custom_scrap_margin_percentage(frm, cdt, cdn) {
    calculate_scrap_and_transport(frm, cdt, cdn);
},

custom_transportation_cost(frm, cdt, cdn) {
    calculate_scrap_and_transport(frm, cdt, cdn);
},
});


// ======================================================
// WEIGHT CALCULATION (FIXED)
// ======================================================
function calculate_kgs(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    let type = row.item_group;   // ✅ FIXED
    let density = flt(row.custom_density);
    let π = Math.PI;

    let weight = 0;

    if (!density) return;

    if (type === "Plates") {
        weight = (flt(row.custom_length) * flt(row.custom_width) * flt(row.custom_thickness) * density) / 1000000;
    }
    else if (["Tubes", "Pipes"].includes(type)) {
        let R = flt(row.custom_outer_diameter) / 2;
        let r = Math.max(R - flt(row.custom_wall_thickness), 0);
        weight = (π * (R**2 - r**2) * flt(row.custom_length) * density) / 1000000;
    }
    else if (["Flanges", "Rings"].includes(type)) {
        weight = (π * ((flt(row.custom_outer_diameter)/2)**2 - (flt(row.custom_inner_diameter)/2)**2) * flt(row.custom_thickness) * density) / 1000000;
    }
    else if (type === "Rods") {
        weight = (π * (flt(row.custom_outer_diameter)/2)**2 * flt(row.custom_length) * density) / 1000000;
    }

    console.log("Weight Calculated:", weight);  // 🔍 Debug

    frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", flt(weight, 4));

    calculate_total_weight(frm, cdt, cdn);
}


// ======================================================
// TOTAL WEIGHT
// ======================================================
function calculate_total_weight(frm, cdt, cdn) {

    let row = locals[cdt][cdn];
    let total = flt(row.qty) * flt(row.custom_kilogramskgs);

    frappe.model.set_value(cdt, cdn, "custom_total_weights", flt(total, 4));

    calculate_rate_from_weight(frm, cdt, cdn);
    calculate_amount(frm, cdt, cdn);
    calculate_scrap_and_transport(frm, cdt, cdn);
}


// ======================================================
// RATE
// ======================================================
function calculate_rate_from_weight(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    if (row.custom_rate_per_kg && row.custom_total_weights) {

        let rate = row.custom_rate_per_kg * row.custom_total_weights;

        console.log("Rate:", rate); // 🔍 Debug

        frappe.model.set_value(cdt, cdn, "rate", flt(rate, 2));
    }
}


// ======================================================
// AMOUNT
// ======================================================
function calculate_amount(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    let amount = flt(row.qty) * flt(row.rate);

    console.log("Amount:", amount); // 🔍 Debug

    frappe.model.set_value(cdt, cdn, "amount", flt(amount, 2));
}

function calculate_scrap_and_transport(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    let total_weight = flt(row.custom_total_weights) || 0;
    let scrap_pct = flt(row.custom_scrap_margin_percentage) || 0;
    let transport_rate = flt(row.custom_transportation_cost) || 0;

    // ✅ Scrap KG
    let scrap_kg = total_weight * (scrap_pct / 100);

    // ✅ Transport Cost
    let transport_cost = total_weight * transport_rate;

    console.log("Scrap KG:", scrap_kg);
    console.log("Transport Cost:", transport_cost);

    frappe.model.set_value(cdt, cdn, "custom_scrap_margin_kg", flt(scrap_kg, 4));
    frappe.model.set_value(cdt, cdn, "custom_transportation_cost_", flt(transport_cost, 2));
}