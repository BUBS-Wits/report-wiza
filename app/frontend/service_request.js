import {REQUEST_CATEGORIES} from "../../packages/shared/constants.js"
import {ResidentRequest} from "../../packages/shared/request.js"
// const {REQUEST_CATEGORIES} = require("../../packages/shared/constants.js")

let categories_select, file_input, preview, submit, form
if (typeof window !== "undefined" && typeof document !== "undefined") {
	form = document.body.querySelector("main form")
	categories_select = document.body.querySelector("main form select#category")
	file_input = document.body.querySelector("main form input#image")
	preview = document.body.querySelector("main form img#preview")
	submit = document.body.querySelector("main form button")
	fill_select_options(document, categories_select, REQUEST_CATEGORIES)
	if (file_input.files.length > 0 && file_input.files[0]) {
		const img_uri = URL.createObjectURL(file_input.files[0])
		preview.style.display = "block"
		preview.src = img_uri 
		preview.onload = () => {
			URL.revokeObjectURL(img_uri)
		}
	} else {
		preview.style.display = "none"
		preview.src = ""
		file_input.value = ""
	}
}

function preview_image(img) {
	const img_uri = URL.createObjectURL(img)
	preview.src = img_uri 
	preview.style.display = "block"
	preview.onload = () => {
		URL.revokeObjectURL(img_uri)
	}
}

export function fill_select_options(dom, select, options) {
	if (!select || typeof dom === "undefined")
		return
	select.replaceChildren()
	const default_option = dom.createElement("option")
	default_option.setAttribute("value", "")
	default_option.textContent = "--Please choose a category--"
	select.append(default_option)
	options.forEach(option => {
		const tmp = dom.createElement("option")
		tmp.setAttribute("value", option)
		tmp.textContent = option.replaceAll(
			/((^[a-z])|( [a-z]|_[a-z]))/g,
			match => match.replace("_", " ").toUpperCase()
		)
		select.append(tmp)
	})
}

export async function get_data_uri(file) {
	if (typeof window !== "undefined") {
		// native browser
		return new Promise(resolve => {
			const reader = new FileReader()
			reader.onload = e => {
				const data_uri = e.target.result
				resolve(data_uri)
			}
			reader.readAsDataURL(file)
		})
	} else {
		// nodejs
		const buffer = Buffer.from(await file.arrayBuffer())
		const data_uri = `data:${file.type};base64,${buffer.toString("base64")}`
		return data_uri
	}
}

export async function get_request_input(dom) {
	if (typeof dom === "undefined")
		return null
	const select = dom.querySelector("select")
	const textarea = dom.querySelector("textarea")
	const files_input = dom.querySelector("input#image")
	if (!select.selectedOptions[0].value || !textarea ||
			!textarea.value || !files_input ||
			files_input.files.length <= 0) {
		return null
	}
	const request = new ResidentRequest(
		select.selectedOptions[0].value,
		textarea.value,
		await get_data_uri(files_input.files[0])
	)
	return request
}

file_input?.addEventListener("change", e => {
	const file = e.target.files[0]
	if (file) {
		preview_image(file)
	} else {
		preview.style.display = "none"
	}
})

submit?.addEventListener("click", async (e) => {
	const request = await get_request_input(document)
	if (request) {
		e.stopPropagation()
		e.preventDefault()
	} else {
		console.error(`Please provide complete information.`)
	}
})
