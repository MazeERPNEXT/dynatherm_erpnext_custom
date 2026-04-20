frappe.listview_settings['BOM Creator'] = {

    onload: function(listview) {

        listview.page.add_inner_button(
            'Download Template',
            function () {

                frappe.call({
                    method: "erp_custom.erp_custom.overrides.bom_creator.download_bom_template",
                    callback: function (r) {
                        if (r.message) {
                            window.open(r.message);
                        }
                    }
                });

            }
        );

    }
};