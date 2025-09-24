// frappe.ui.form.on('Item', {
//     length: function(frm) {
//         calculate_kg(frm);
//     },
//     width: function(frm) {
//         calculate_kg(frm);
//     },
//     thickness: function(frm) {
//         calculate_kg(frm);
//     }
// });

// function calculate_kg(frm) {
//     if (frm.doc.length && frm.doc.width && frm.doc.thickness) {
//         const density = 7.85; 
//         let value = frm.doc.length * frm.doc.width * frm.doc.thickness * density;
//         let value_in_millions = (value / 1000000).toFixed(2);

//         frm.set_value("kilogramskgs", value_in_millions);
//     }
//     else{
//         frm.set_value("kilogramskgs", "0");
//     }
// }


frappe.ui.form.on('Item', {
    validate: function(frm) {
        if (frm.doc.custom_length && frm.doc.custom_width && frm.doc.custom_thickness) {
            const density = 7.85; 

            let grams = frm.doc.custom_length * frm.doc.custom_width * frm.doc.custom_thickness * density;
            let kilograms = (grams / 1000).toFixed(2);

            frm.set_value("custom_kilogramskgs", kilograms);
        } else {
            frm.set_value("custom_kilogramskgs", 0);
        }
    }
});

