app_name = "erp_custom"
app_title = "ERP Custom"
app_publisher = "maze"
app_description = "ERP Custom"
app_email = "msk312508@gmail.com"
app_license = "mit"

# Apps
# ------------------

required_apps = ["resilient-tech/india_compliance"]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "erp_custom",
# 		"logo": "/assets/erp_custom/logo.png",
# 		"title": "ERP Custom",
# 		"route": "/erp_custom",
# 		"has_permission": "erp_custom.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/erp_custom/css/erp_custom.css"
# app_include_js = "/assets/erp_custom/js/erp_custom.js"

app_include_js = [
    "/assets/erp_custom/js/stock_entry.js"
]


# include js, css files in header of web template
# web_include_css = "/assets/erp_custom/css/erp_custom.css"
# web_include_js = "/assets/erp_custom/js/erp_custom.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "erp_custom/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "erp_custom/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "erp_custom.utils.jinja_methods",
# 	"filters": "erp_custom.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "erp_custom.install.before_install"
# after_install = "erp_custom.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "erp_custom.uninstall.before_uninstall"
# after_uninstall = "erp_custom.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "erp_custom.utils.before_app_install"
# after_app_install = "erp_custom.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "erp_custom.utils.before_app_uninstall"
# after_app_uninstall = "erp_custom.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "erp_custom.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"erp_custom.tasks.all"
# 	],
# 	"daily": [
# 		"erp_custom.tasks.daily"
# 	],
# 	"hourly": [
# 		"erp_custom.tasks.hourly"
# 	],
# 	"weekly": [
# 		"erp_custom.tasks.weekly"
# 	],
# 	"monthly": [
# 		"erp_custom.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "erp_custom.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "erp_custom.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "erp_custom.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["erp_custom.utils.before_request"]
# after_request = ["erp_custom.utils.after_request"]

# Job Events
# ----------
# before_job = ["erp_custom.utils.before_job"]
# after_job = ["erp_custom.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"erp_custom.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# doc_events = {
#     "Item": {
#         "before_save": "erp_custom.item_hooks.calculate_kilograms"
#     }
# }

# doc_events = {
#     "Item": {
#         "validate": "erp_custom.item_hooks.calculate_kilograms"
#     },
# }



# doctype_js = {
#     "Item": "public/js/item.js"
# }

# fixtures = [
#     {
#         "doctype": "Item Group",
#         "filters": {
#             "name": ["in", [
#                 "Consumables", "Drillbits", "Dye Penetrant", "Gas", "Paint", "Safety Items", "Weld", "Weld Accessory", "Woodboxes",
#                 "Machinery", "Computer Accesory", "Diesel Generators", "Drilling", "Fans", "Hydraulic Tighteners", "Instruments", "Mother Oven", "Power Tools", "Printers", "Products", "Weld",
#                 "Raw Material", "Demister", "Fasteners", "flanges", "Forgings", "Gaskets", "Import", "Name Plate", "Pipes", "Plates", "Polymer Sheet", "Trays", "Tubes", "Weld",
#                 "Services", "Bio Pit", "Chemical Spray", "Cladding", "Construction", "Cranes", "Design", "Dish End", "Dish Forming", "Drilling", "Fabrication", "Government", "Heat Treatment",
#                 "Machine Repair", "Machinery", "Pickling Passivation", "PV Elite", "Rental", "Rolling", "RT", "Sandblasting Painting", "Testing", "TPI", "Transport", "Water Jet Cutting", "Weighing",
#             ]]
#         }
#     }
# ]


# fixtures = [
#     {
#         "doctype": "Item Group",
#         "filters": {
#             "name": ["in", [
#                 "Consumables",
#                 "Machinery",
#                 "Raw Material",
#                 "Services"
#             ]]
#         }
#     }
# ]

fixtures = [
    "Item Group"
]

fixtures = [
    {
        "doctype": "Certification Type",
        "filters": {
            "name": ["is", "set"]
        }
    }
]

fixtures = [
    "Supplier Type",
    "Raw Material Type",
    "Services Type",
    "Consumable Type",
    "Machinery Type",
    "Certification Type"
]


# doctype_js = {
#     "Customer Request For Quotation": "public/js/customer_request_for_quotation.js"
# }


doctype_js = {
    "Estimate": "public/js/estimate.js",
    "Estimate Item": "public/js/estimate_item.js",
    "Item": "public/js/item.js",
    "BOM": "public/js/bom.js",
    "BOM Item": "public/js/bom_item.js",
    "Quotation": "public/js/quotation.js",
    
    "Work Order": "public/js/work_order.js",
    "Stock Entry": "public/js/stock_entry.js",
    "Material Request": "public/js/material_request.js",
    
    "Purchase Order": "public/js/purchase_order.js",
    "Purchase Receipt": "public/js/purchase_receipt.js",
    "Purchase Invoice": "public/js/purchase_invoice.js",
    
    "Sales Order": "public/js/sales_order.js",
    "Sales Invoice": "public/js/sales_invoice.js",
    "Delivery Note": "public/js/delivery_note.js",
    
    "Stock Order": "public/js/stock_order.js",
}


override_whitelisted_methods = {
    "erpnext.manufacturing.doctype.work_order.work_order.make_work_order":
        "erp_custom.erp_custom.overrides.work_order.make_work_order",
        
    # "erpnext.stock.doctype.stock_entry.stock_entry.make_stock_in_entry":
    #     "erp_custom.erp_custom.overrides.stock_entry.make_stock_in_entry"
}


# doc_events = {
#     "Stock Entry": {
#         "before_save": "erp_custom.overrides.stock_entry_utils.copy_custom_dimensions_from_work_order"
#     }
# }
