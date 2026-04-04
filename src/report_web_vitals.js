const report_web_vitals = on_perf_entry => {
	if (on_perf_entry && on_perf_entry instanceof Function) {
		import('web-vitals').then(({
			getCLS,
			getFID,
			getFCP,
			getLCP,
			getTTFB
		}) => {
			getCLS(on_perf_entry)
			getFID(on_perf_entry)
			getFCP(on_perf_entry)
			getLCP(on_perf_entry)
			getTTFB(on_perf_entry)
		})
	}
}

export default report_web_vitals
