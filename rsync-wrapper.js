const rsync = require('rsyncwrapper')

module.exports = function(RED) {
	function rsyncNode(n) {
		RED.nodes.createNode(this, n);
		this.source = n.source
		this.destination = n.destination
		this.verbose = n.verbose
		this.recursive = n.recursive
		var node = this;

		node.on('input', function(msg) {
			rsyncRun(node, msg);
		});
	}

	RED.nodes.registerType("rsync", rsyncNode);

	function rsyncRun(node, msg) {
		var source = typesOrDefault(['string', 'array'], msg.source, node.source)
		var destination = typesOrDefault(['string'], msg.destination, node.destination)
		var verbose = trueOrDefault(msg.verbose, node.verbose === true)
		var recursive = trueOrDefault(msg.recursive, node.recursive === true)

		var args = []
		if (verbose === true) args.push('-v')

		var options = {
			src: source,
			dest: destination,
			recursive: recursive,
			args: args,
		}

		rsync(options, function(error, stdout, stderr, cmd) {
			if (error !== null) msg.error = error
			if (stdout !== "") msg.stdout = stdout
			if (stderr !== "") msg.stderr = stderr
			msg.cmd = cmd
			if (error) {
				node.send([null, msg])
			} else {
				node.send([msg, null])
			}
		})
	}

	function typesOrDefault(types, v, d) {
		var t = typeof v
		if (Array.isArray(v)) t = 'array'
		return (types.includes(t)) ? v : d
	}

	function trueOrDefault(v, d) {
		return (v === true) ? v : d
	}
}
