frappe.listview_settings['Quality Assurance Plan'] = {
    onload: function(listview) {

        // ✅ ADD BUTTON IN LIST VIEW
        listview.page.add_inner_button('Download Template', function () {

            frappe.call({
                method: "erp_custom.erp_custom.doctype.quality_assurance_plan.quality_assurance_plan.download_qap_template",
                callback: function (r) {
                    if (r.message) {
                        window.open(r.message);
                    }
                }
            });

        });
    },

    refresh: function(listview) {

        setTimeout(() => {

            // 🔹 Progress Bar Color + Percentage Text
            $('.per_progress .progress-bar').each(function() {

                let percent = parseInt($(this).attr('aria-valuenow')) || 0;

                $(this).removeClass(
                    'progress-bar-success progress-bar-warning progress-bar-danger'
                );

                if (percent < 50) {
                    $(this).addClass('progress-bar-danger');
                } 
                else if (percent < 80) {
                    $(this).addClass('progress-bar-warning');
                } 
                else {
                    $(this).addClass('progress-bar-success');
                }

                $(this).text(percent + "%");
            });

            // 🔹 Rename ID Column Header
            $('span[data-sort-by="name"]')
                .text('QAP ID')
                .attr('title', 'Click to sort by QAP ID');

        }, 200);

    }

};