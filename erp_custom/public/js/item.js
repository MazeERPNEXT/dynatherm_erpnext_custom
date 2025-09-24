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

