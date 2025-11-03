frappe.ui.form.on("Work Order Item", {
    item_code: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (frm.doc.bom && row.item_code) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "BOM Item",
                    fields: ["custom_length", "custom_width", "custom_thickness","custom_density","custom_kilogramskgs"],
                    filters: {
                        parent: frm.doc.bom,
                        item_code: row.item_code
                    },
                    limit_page_length: 1
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        const bom_item = r.message[0];

                        frappe.model.set_value(cdt, cdn, "custom_length", bom_item.custom_length || 0);
                        frappe.model.set_value(cdt, cdn, "custom_width", bom_item.custom_width || 0);
                        frappe.model.set_value(cdt, cdn, "custom_thickness", bom_item.custom_thickness || 0);
                        frappe.model.set_value(cdt, cdn, "custom_density", bom_item.custom_density || 0);
                        frappe.model.set_value(cdt, cdn, "custom_kilogramskgs", bom_item.custom_kilogramskgs || 0);

                        frm.refresh_field("items");
                    }
                }
            });
        }
    }
});



