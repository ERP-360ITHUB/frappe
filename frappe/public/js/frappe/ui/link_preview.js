frappe.ui.LinkPreview = class {

	constructor() {
		this.popovers_list = [];
		this.LINK_CLASSES = 'a[data-doctype], input[data-fieldtype="Link"], .popover';
		this.popover_timeout = null;
		this.setup_events();
	}

	setup_events() {
		$(document.body).on('mouseover', this.LINK_CLASSES, (e) => {
			this.link_hovered = true;
			this.element = $(e.currentTarget);
			this.is_link = this.element.get(0).tagName.toLowerCase() === 'a';

			if (!this.element.parents().find('.popover').length) {
				this.identify_doc();
				this.popover = this.element.data("bs.popover");
				if (this.name && this.doctype) {
					this.setup_popover_control(e);
				}
			}
		});
		this.handle_popover_hide();

	}

	identify_doc() {
		if (this.is_link) {
			this.doctype = this.element.attr('data-doctype');
			this.name = this.element.attr('data-name');
			this.href = this.element.attr('href');
		} else {
			this.href = this.element.parents('.control-input-wrapper').find('.control-value a').attr('href');
			// input
			this.doctype = this.element.attr('data-target');
			this.name = this.element.val();
		}
	}

	setup_popover_control(e) {
		if (!(frappe.boot.link_preview_doctypes || []).includes(this.doctype)) {
			return;
		}
		//If control field value is changed, new popover has to be created
		this.element.on('change', () => {
			this.new_popover = true;
		});
		if (!this.popover || this.new_popover) {
			this.data_timeout = setTimeout(() => {
				this.create_popover(e);
			}, 100);

		} else {
			this.popover_timeout = setTimeout(() => {
				if (this.element.is(':focus')) {
					return;
				}
				this.show_popover(e);
			}, 1000);
		}
	}

	create_popover(e) {
		this.new_popover = false;
		if (this.element.is(':focus')) {
			return;
		}

		this.get_preview_data().then(preview_data => {
			if (preview_data) {
				if (this.popover_timeout) {
					clearTimeout(this.popover_timeout);
				}

				this.popover_timeout = setTimeout(() => {
					if (this.popover) {
						let new_content = this.get_popover_html(preview_data);
						this.popover.options.content = new_content;
					} else {
						this.init_preview_popover(preview_data);
					}
					this.show_popover(e);

				}, 1000);
			}
		});
	}

	show_popover(e) {
		this.default_timeout = setTimeout(() => {
			this.clear_all_popovers();
		}, 10000);

		if (!this.is_link) {
			var left = e.pageX;
			this.element.popover('show');
			var width = $('.popover').width();
			$('.control-field-popover').css('left', (left - (width / 2)) + 'px');
		} else {
			this.element.popover('show');
		}
	}

	handle_popover_hide() {
		$(document).on('mouseout', this.LINK_CLASSES, () => {
			// To allow popover to be hovered on
			if (!$('.popover:hover').length) {
				this.link_hovered = false;
			}
			if (!this.link_hovered) {
				if (this.data_timeout) {
					clearTimeout(this.data_timeout);
				}
				if (this.popover_timeout) {
					clearTimeout(this.popover_timeout);
				}
				if (this.default_timeout) {
					clearTimeout(this.default_timeout);
				}
				this.clear_all_popovers();
			}
		});

		$(window).on('hashchange', () => {
			this.clear_all_popovers();
		});
	}

	clear_all_popovers() {
		this.popovers_list.forEach($el => $el.hide());
	}

	get_preview_data() {
		return frappe.xcall('frappe.desk.link_preview.get_preview_data', {
			'doctype': this.doctype,
			'docname': this.name,
		});
	}

	init_preview_popover(preview_data) {
		let popover_content = this.get_popover_html(preview_data);
		this.element.popover({
			container: 'body',
			html: true,
			content: popover_content,
			trigger: 'manual',
			placement: 'top auto',
			animation: false,
		});

		const $popover = this.element.data('bs.popover').tip();

		$popover.addClass('link-preview-popover');
		$popover.toggleClass('control-field-popover', this.is_link);

		this.popovers_list.push(this.element.data('bs.popover'));

	}

	get_popover_html(preview_data) {
		if (!this.href) {
			this.href = window.location.href;
		}

		if (this.href && this.href.includes(' ')) {
			this.href = this.href.replace(new RegExp(' ', 'g'), '%20');
		}

		let image_html = '';
		let id_html = '';
		let content_html = '';

		if (preview_data.preview_image) {
			let image_url = encodeURI(preview_data.preview_image);
			image_html = `
				<div class="preview-header">
					<img src="${image_url}" onerror="this.src='/assets/frappe/images/fallback-thumbnail.jpg'" class="preview-image"></img>
				</div>
			`;
		}

		if (preview_data.preview_title != preview_data.name) {
			id_html = `<a class="text-muted" href=${this.href}>${preview_data.name}</a>`;
		}

		Object.keys(preview_data).forEach(key => {
			if (!['preview_image', 'preview_title', 'name'].includes(key)) {
				let value = frappe.ellipsis(preview_data[key], 280);
				let label = key;
				content_html = `
					<div class="preview-table">
						<div class="preview-field">
							<div class='small preview-label text-muted bold'>${label}</div>
							<div class="small preview-value">${value}</div>
						</div>
					</div>
				`;
			}
		});

		let popover_content =`
			<div class="preview-popover-header">${image_html}
				<div class="preview-header">
					<div class="preview-main">
						<a class="preview-name bold" href=${this.href}>${preview_data.preview_title}</a>
						<span class="text-muted small">${this.doctype} ${id_html}</span>
					</div>
				</div>
			</div>
			<hr>
			<div class="popover-body">
				${content_html}
			</div>
		`;

		return popover_content;
	}

};
