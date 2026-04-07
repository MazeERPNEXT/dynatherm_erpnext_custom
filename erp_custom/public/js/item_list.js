// frappe.listview_settings["Item"] = {
//     onload(listview) {

//         // Force Report View
//         if (listview.view_name !== "Report") {
//             listview.page.switch_view("Report");
//         }
//     }
// };



// frappe.listview_settings["Item"] = {
//     onload(listview) {

//         // ✅ Delay to ensure route is ready
//         setTimeout(() => {

//             const current_route = frappe.get_route();

//             // current_route example:
//             // ["List", "Item", "List"]

//             if (current_route[2] !== "Report") {

//                 frappe.set_route("List", "Item", "Report");
//             }

//         }, 500);
//     }
// };


