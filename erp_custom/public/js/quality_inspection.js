frappe.ui.form.on('Quality Inspection', {

    before_save(frm) {

        // Generate date
        let today = frappe.datetime.get_today(); // yyyy-mm-dd
        let parts = today.split("-");

        let formatted_date = `${parts[2]}-${parts[1]}-${parts[0]}`;

        // Set naming series
        frm.set_value('naming_series', `DAPL-INS-${formatted_date}`);
    }

});