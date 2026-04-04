
// frappe.ui.form.on('Project', {
//     refresh(frm) {

//         // Show button only if document is submitted
//         if (frm.doc.docstatus === 1) {

//             frm.add_custom_button('Quality Assurance Plan', () => {

//                 // Open new QAP form with mapped values
//                 frappe.new_doc('Quality Assurance Plan', {
//                     project: frm.doc.project_name
//                 });

//             }, 'Create');

//         }
//     }
// });


// frappe.ui.form.on('Project', {
//     refresh(frm) {

//         if (!frm.is_new()) {
//             frm.add_custom_button(__('Bill of Materials'), () => {
//                 frappe.new_doc('BOM', {
//                     project: frm.doc.name  
//             });
//             }, __('Create'));
//             frm.add_custom_button('Quality Assurance Plan', () => {
//                 frappe.new_doc('Quality Assurance Plan', {
//                     project: frm.doc.project_name
//                 });
//             }, 'Create');
//         }
//     }
// });

frappe.ui.form.on('Project', {
    refresh(frm) {

        if (frm.is_new()) return;

        // ✅ BOM
        frm.add_custom_button(__('Bill of Materials'), () => {
            frappe.new_doc('BOM', {
                project: frm.doc.name
            });
        }, __('Create'));

        // ✅ QAP
        frm.add_custom_button(__('Quality Assurance Plan'), () => {
            frappe.new_doc('Quality Assurance Plan', {
                project: frm.doc.name   
            });
        }, __('Create'));

    }
});