frappe.ui.form.on("Purchase Order", {
    //  refresh(frm) {
    //     if (frm.doc.docstatus === 1) {

    //         frm.add_custom_button("Send Email for Purchase", function () {

    //             frappe.call({
    //                 method: "erp_custom.erp_custom.overrides.purchase_order.send_purchase_email",
    //                 args: {
    //                     purchase_order: frm.doc.name
    //                 },
    //                 callback: function (r) {
    //                     if (r.message) {
    //                         frappe.msgprint("Email sent to Purchase Team successfully");
    //                     }
    //                 }
    //             });

    //         });
    //     }
    // },
    refresh(frm) {

        if (frm.doc.docstatus === 1) {

            frm.add_custom_button("Send Email for Purchase", function () {

                frappe.call({
                    method: "erp_custom.erp_custom.overrides.purchase_order.send_purchase_email",
                    args: {
                        purchase_order: frm.doc.name
                    },
                    callback: function (r) {

                        let d = r.message;

                        let html = `
                        <div style="font-family: Arial; padding:20px; color:#333; line-height:1.6;">

                            <!-- HEADER -->
                            <div style="text-align:center; border-bottom:2px solid #2e7d32; padding-bottom:10px;">
                                <h1 style="color:#2e7d32; margin:0;">${d.company_name}</h1>

                                <div style="font-size:12px; color:#555; margin-top:5px;">
                                    ${(d.company_address || "").replace(/<br>/g, ", ")}
                                </div>

                                <div style="font-size:12px; margin-top:5px;">
                                    <b>Email:</b> ${d.company_email || "-"} &nbsp;&nbsp; | &nbsp;&nbsp;
                                    <b>GST:</b> ${d.company_gstin || "-"}
                                </div>
                            </div>

                            <h2 style="text-align:center; margin:15px 0;">PURCHASE ORDER</h2>

                            <!-- INFO -->
                            <table style="width:100%; border-collapse:collapse;">
                                <tr>

                                    <td style="width:50%; border:1px solid #ddd; padding:12px;">
                                        <b>PO:</b> ${d.po}<br>
                                        <b>Job Ref:</b> ${d.job_ref || ""}<br>
                                        <b>Supplier:</b> ${d.supplier}<br><br>
                                        <b>Contact:</b> ${d.contact_name || ""}
                                    </td>

                                    <td style="width:50%; border:1px solid #ddd; padding:12px;">
                                        <b>Date:</b> ${d.date}<br>
                                        <b>Required By:</b> ${d.required_by || ""}<br><br>

                                        <b>Billing Address:</b><br>
                                        ${d.billing_address || ""}
                                    </td>

                                </tr>
                            </table>

                        </div>
                        `;

                        // let w = window.open("", "_blank");
                        // w.document.write(html);
                        // w.document.close();
                        // w.print();
                    }
                });

            });
        }
    },

    validate: function(frm) {

        // 🔹 Check Supplier
        return frappe.call({
            method: "erp_custom.erp_custom.overrides.purchase_order.validate_item_workflow",
            args: {
                supplier: frm.doc.supplier
            }
        }).then(r => {

            if (r.message.status === "error") {
                frappe.throw(r.message.message);
            }

            // 🔹 Check Items
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
