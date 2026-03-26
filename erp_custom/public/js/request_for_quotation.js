
frappe.ui.form.on("Request for Quotation", {
    refresh(frm) {

        // Remove buttons only in Draft
        if (frm.doc.docstatus === 0) {

            frm.remove_custom_button("Opportunity", "Get Items From");
            frm.remove_custom_button("Possible Supplier", "Get Items From");
            frm.remove_custom_button("Link to Material Requests", "Tools");

            // Ensure removal after ERPNext re-renders
            setTimeout(() => {
                frm.remove_custom_button("Opportunity", "Get Items From");
                frm.remove_custom_button("Possible Supplier", "Get Items From");
                frm.remove_custom_button("Link to Material Requests", "Tools");
            }, 500);

             frm.add_custom_button(
                __("Bill of Materials"),
                () => open_bom_dialog(frm),
                __("Get Items From")
            );
        }
    }
});

frappe.ui.form.on("Request for Quotation Supplier", {
    supplier(frm, cdt, cdn) {

        let row = locals[cdt][cdn];
        if (!row.contact) return;   // use existing contact

        // 🔹 Fetch email directly from Contact
        frappe.db.get_value("Contact", row.contact, "email_id")
            .then(r => {
                let email = r.message?.email_id || "";
                frappe.model.set_value(cdt, cdn, "email_id", email);
            });
    }
});



function open_bom_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: "Get Items from BOM",
        fields: [
            {
                label: "BOM",
                fieldname: "bom",
                fieldtype: "Link",
                options: "BOM",
                reqd: 1
            }
        ],
        primary_action_label: "Get Items",
        primary_action(values) {

            frappe.db.get_doc("BOM", values.bom).then(doc => {

                let items = doc.items || [];

                if (!items.length) {
                    frappe.msgprint("No items found in BOM");
                    return;
                }

                // Remove only default empty row
                if (frm.doc.items && frm.doc.items.length === 1 && !frm.doc.items[0].item_code) {
                    frm.clear_table("items");
                }

                items.forEach(bom_item => {

                    let row = frm.add_child("items");

                    // 🔹 Core mapping (L: RFQ | R: BOM)
                    row.item_code = bom_item.item_code;
                    row.item_name = bom_item.item_name;
                    row.item_group = bom_item.custom_item_group;
                    row.uom = bom_item.uom;
                    row.qty = bom_item.qty;

                    row.custom_length = bom_item.custom_length;
                    row.custom_width = bom_item.custom_width;
                    row.custom_thickness = bom_item.custom_thickness;
                    row.custom_density = bom_item.custom_density;
                    row.custom_kilogramskgs = bom_item.custom_kilogramskgs;

                    row.custom_total_weight = bom_item.custom_total_weight;
                    row.custom_scrap_margin_percentage = bom_item.custom_scrap_margin_percentage;
                    row.custom_scrap_margin_kg = bom_item.custom_scrap_margin_kgs;
                    row.custom_transportation_cost = bom_item.custom_transportation_cost;
                    row.custom_transportation_cost_ = bom_item.custom_transportation_cost_kgs;

                    // 🔹 Optional (safe mapping)
                    row.description = bom_item.description || "";
                    row.stock_uom = bom_item.stock_uom || bom_item.uom;

                });

                frm.refresh_field("items");
                frappe.msgprint("BOM Items Added");
                d.hide();
            });
        }
    });

    d.show();
}