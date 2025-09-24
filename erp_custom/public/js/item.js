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
    else{
        frm.set_value("kilogramskgs", "0");
    }
}
