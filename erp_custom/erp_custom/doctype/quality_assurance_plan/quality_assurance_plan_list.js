frappe.listview_settings['Quality Assurance Plan'] = {

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