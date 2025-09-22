frappe.ui.form.on('Item', {
    length: function(frm) {
        calculate_kg(frm);
    },
    width: function(frm) {
        calculate_kg(frm);
    },
    thickness: function(frm) {
        calculate_kg(frm);
    }
});

function calculate_kg(frm) {
    if (frm.doc.length && frm.doc.width && frm.doc.thickness) {
        const density = 7.85; 
        let value = frm.doc.length * frm.doc.width * frm.doc.thickness * density;
        let value_in_millions = (value / 1000000).toFixed(2);

        frm.set_value("kilogramskgs", value_in_millions);
    }
}



// // ----------------- ITEM MASTER -----------------
// frappe.ui.form.on('Item', {
//     length: function(frm) { calculate_kg_item(frm); },
//     width: function(frm) { calculate_kg_item(frm); },
//     thickness: function(frm) { calculate_kg_item(frm); }
// });

// // Calculate Kgs in Item master
// function calculate_kg_item(frm) {
//     if (frm.doc.length && frm.doc.width && frm.doc.thickness) {
//         const density = 7.85;
//         let value = frm.doc.length * frm.doc.width * frm.doc.thickness * density;
//         let value_in_millions = (value / 1000000).toFixed(2);
//         frm.set_value("kilogramskgs", value_in_millions);
//     }
// }

// // ----------------- CHILD TABLES -----------------
// // Generic function to calculate Kgs for child table rows
// function calculate_kg_for_row(row) {
//     if(row.length && row.width && row.thickness){
//         const density = 7.85;
//         let value = row.length * row.width * row.thickness * density;
//         row.kilogramskgs = (value / 1000000).toFixed(2);
//     }
// }

// function calculate_kg_row_and_refresh(frm, cdt, cdn, child_table_fieldname){
//     let row = locals[cdt][cdn];
//     calculate_kg_for_row(row);
//     frm.refresh_field(child_table_fieldname);
// }

// // List of child tables to apply the calculation
// const child_tables = [
//     { doctype: 'Purchase Order', fieldname: 'item' },
//     { doctype: 'Material Request', fieldname: 'item' },
//     { doctype: 'Purchase Invoice', fieldname: 'item' },
//     { doctype: 'Sales Order', fieldname: 'item' },
//     { doctype: 'Stock Entry', fieldname: 'item' }
// ];

// // Dynamically attach events for each child table
// child_tables.forEach(table => {
//     frappe.ui.form.on(table.doctype, {
//         item_code: function(frm, cdt, cdn) {
//             let row = locals[cdt][cdn];
//             // wait for fetched fields to populate
//             setTimeout(() => {
//                 calculate_kg_row_and_refresh(frm, cdt, cdn, table.fieldname);
//             }, 100);
//         },
//         length: function(frm, cdt, cdn) { calculate_kg_row_and_refresh(frm, cdt, cdn, table.fieldname); },
//         width: function(frm, cdt, cdn) { calculate_kg_row_and_refresh(frm, cdt, cdn, table.fieldname); },
//         thickness: function(frm, cdt, cdn) { calculate_kg_row_and_refresh(frm, cdt, cdn, table.fieldname); }
//     });
// });

