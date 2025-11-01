// frappe.ui.form.on("Material Request", {
//     refresh(frm) {
//         console.log("✅ Hook working! Material Request JS loaded.");

//         frm.doc.items.forEach(row => {
//             frappe.model.set_value(row.doctype, row.name, "custom_length", 111);
//             frappe.model.set_value(row.doctype, row.name, "custom_width", 222);
//             frappe.model.set_value(row.doctype, row.name, "custom_thickness", 333);
//         });

//         frm.refresh_field("items");
//         frappe.msgprint("Static custom values set successfully ✅");
//     },
// });



// frappe.ui.form.on("Material Request", {
//     refresh(frm) {
//         console.log("Material Request JS Loaded.");

//         // Check if Stock Entry is selected
//         if (!frm.doc.stock_entry) return;

//         // if (!frm.doc.stock_entry) {
//         //     frappe.msgprint("Please select a Stock Entry first.");
//         //     return;
//         // }

//         console.log("Fetching from Stock Entry:", frm.doc.stock_entry);

//         frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Stock Entry",
//                 name: frm.doc.stock_entry,
//             },
//             callback: function (r) {
//                 if (!r.message) {
//                     frappe.msgprint("No Stock Entry found.");
//                     return;
//                 }

//                 const stock_entry = r.message;
//                 const items = stock_entry.items || [];

//                 console.log("Stock Entry Items:", items);

//                 if (!items.length) {
//                     frappe.msgprint("No child items found in Stock Entry.");
//                     return;
//                 }

//                 // Map by item_code for matching
//                 const lookup = {};
//                 items.forEach(it => {
//                     lookup[it.item_code] = {
//                         length: it.custom_length || 0,
//                         width: it.custom_width || 0,
//                         thickness: it.custom_thickness || 0
//                     };
//                 });

//                 console.log("🔍 Lookup Built:", lookup);

//                 // Update Material Request items dynamically
//                 (frm.doc.items || []).forEach(row => {
//                     const match = lookup[row.item_code];
//                     if (match) {
//                         frappe.model.set_value(row.doctype, row.name, "custom_length", match.length);
//                         frappe.model.set_value(row.doctype, row.name, "custom_width", match.width);
//                         frappe.model.set_value(row.doctype, row.name, "custom_thickness", match.thickness);
//                     }
//                 });

//                 frm.refresh_field("items");
//                 frappe.msgprint("Custom dimensions fetched successfully!");
//             },
//         });
//     },
// });









// frappe.ui.form.on("Material Request", {
//     onload(frm) {
//         if (frm.doc.stock_entry) {
//             frm.trigger("get_dimensions_from_stock_entry");
//         }
//     },

//     stock_entry(frm) {
//         frm.trigger("get_dimensions_from_stock_entry");
//     },

//     get_dimensions_from_stock_entry(frm) {
//         if (!frm.doc.stock_entry) {
//             frappe.msgprint("Please select a Stock Entry first.");
//             return;
//         }

//         frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Stock Entry",
//                 name: frm.doc.stock_entry
//             },
//             callback: function(r) {
//                 if (!r.message) {
//                     frappe.msgprint("Stock Entry not found.");
//                     return;
//                 }

//                 const stock_entry = r.message;
//                 const se_items = stock_entry.items || [];

//                 if (!se_items.length) {
//                     frappe.msgprint("No child items found in Stock Entry.");
//                     return;
//                 }

//                 // Build lookup by item_code
//                 const lookup = {};
//                 se_items.forEach(it => {
//                     lookup[it.item_code] = {
//                         custom_length: it.custom_length || 0,
//                         custom_width: it.custom_width || 0,
//                         custom_thickness: it.custom_thickness || 0,
//                         custom_work_order: stock_entry.work_order || ""
//                     };
//                 });

//                 // Update Material Request Item rows
//                 (frm.doc.items || []).forEach(row => {
//                     const match = lookup[row.item_code];
//                     if (match) {
//                         frappe.model.set_value(row.doctype, row.name, "custom_work_order", match.custom_work_order);
//                         frappe.model.set_value(row.doctype, row.name, "custom_length", match.custom_length);
//                         frappe.model.set_value(row.doctype, row.name, "custom_width", match.custom_width);
//                         frappe.model.set_value(row.doctype, row.name, "custom_thickness", match.custom_thickness);
//                     }
//                 });

//                 frm.refresh_field("items");
//                 frappe.show_alert({ message: "Dimensions fetched successfully!", indicator: "green" });
//             }
//         });
//     }
// });
