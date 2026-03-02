frappe.ui.form.on('Quality Assurance Plan', {

    setup(frm) {
        // Auto fetch item_name from Item master
        frm.add_fetch('item_code', 'item_name', 'item_name');
    },

    item_code(frm) {

        if (!frm.doc.item_name) return;

        // Split words and take first letter of each
        let words = frm.doc.item_name.trim().split(" ");

        let label = words.map(word => word[0].toUpperCase()).join("");

        frm.set_value("item_label", label);
    },

    refresh(frm) {
        update_qap_progress(frm);

        if (!frm.is_new()) {

            let btn = frm.add_custom_button('<i class="fa fa-file-pdf-o" style="font-size:20px;"></i>Generate Dossier', function () {

                frappe.call({
                    doc: frm.doc,
                    method: "merge_pdfs",
                    callback: function (r) {
                        if (r.message) {
                            window.open(r.message);
                        }
                    }
                });

            });

            // Add professional color
            btn.addClass('btn-primary');

        }
    },
     validate: function(frm) {
        update_qap_progress(frm);
    },

    qap_item_add: function(frm) {
        update_qap_progress(frm);
    },

    qap_item_remove: function(frm) {
        update_qap_progress(frm);
    }
});

function update_qap_progress(frm) {

    if (!frm.doc.qap_item || frm.doc.qap_item.length === 0) {
        frm.set_value("per_progress", 0);
        return;
    }

    let total = frm.doc.qap_item.length;

    let completed = frm.doc.qap_item.filter(row => {
        return row.attachment && row.attachment !== "";
    }).length;

    let percent = Math.round((completed / total) * 100);

    frm.set_value("per_progress", percent);
}
