const report_web_vitals = (on_perf_entry) => {
	if (on_perf_entry && on_perf_entry instanceof Function) {
		import('web-vitals').then(
			({ get_cls, get_fid, get_fcp, get_lcp, get_ttfb }) => {
				get_cls(on_perf_entry)
				get_fid(on_perf_entry)
				get_fcp(on_perf_entry)
				get_lcp(on_perf_entry)
				get_ttfb(on_perf_entry)
			}
		)
	}
}

export default report_web_vitals
