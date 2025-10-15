frappe.ui.form.on("Work Order Item", {
    item_code: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (frm.doc.bom && row.item_code) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "BOM Item",
                    fields: ["custom_length", "custom_width", "custom_thickness"],
                    filters: {
                        parent: frm.doc.bom,
                        item_code: row.item_code,
                    },
                    limit_page_length: 1,
                },
                callback: function (r) {
                    if (r.message && r.message.length > 0) {
                        const bom_item = r.message[0];

                        frappe.model.set_value(cdt, cdn, {
                            custom_length: bom_item.custom_length || 0,
                            custom_width: bom_item.custom_width || 0,
                            custom_thickness: bom_item.custom_thickness || 0,
                        });

                        frm.refresh_field("required_items");
                    }
                },
            });
        }
    },
});




// frappe.ui.form.on("Work Order Item", {
//     item_code: function(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];

//         if (!frm.doc.bom || !row.item_code) return;

//         frappe.db.get_list("BOM Item", {
//             fields: ["custom_length", "custom_width", "custom_thickness"],
//             filters: {
//                 parent: frm.doc.bom,
//                 item_code: row.item_code
//             },
//             limit: 1
//         }).then((res) => {
//             if (res && res.length > 0) {
//                 const bom_item = res[0];

//                 frappe.model.set_value(cdt, cdn, "custom_length", bom_item.custom_length || 0);
//                 frappe.model.set_value(cdt, cdn, "custom_width", bom_item.custom_width || 0);
//                 frappe.model.set_value(cdt, cdn, "custom_thickness", bom_item.custom_thickness || 0);
//             } else {
//                 frappe.model.set_value(cdt, cdn, "custom_length", 0);
//                 frappe.model.set_value(cdt, cdn, "custom_width", 0);
//                 frappe.model.set_value(cdt, cdn, "custom_thickness", 0);
//             }
//         }).catch((err) => {
//             console.log("Error fetching BOM Item:", err);
//         });
//     },
// });

