const rsync = require('rsyncwrapper')
var debugNode = null

module.exports = function(RED) {
    function rsyncNode(n) {
        RED.nodes.createNode(this, n);
        this.source = n.source
        this.sourceType = n.sourceType
        this.destination = n.destination
        this.destinationType = n.destinationType
        this.exclude = n.exclude
        this.excludeType = n.excludeType
        this.include = n.include
        this.includeType = n.includeType
        this.dryrun = n.dryrun
        this.verbose = n.verbose
        this.recursive = n.recursive
        this.extra = n.extra
        this.extraType = n.extraType
        var node = this;
        debugNode = node;

        node.on('input', function(msg) {
            rsyncRun(node, msg, (errs, msg) => {
                if (errs.length > 0) {
                    node.error(errs.join("; "), msg);
                } else if (msg) {
                    node.send(msg);
                }
            })
        });
    }

    RED.nodes.registerType("rsync", rsyncNode);

    async function rsyncRun(node, msg, done) {
        var useVerbose = msg.verbose || node.verbose
        var useRecursive = msg.recursive || node.recursive
        var useDryrun = msg.dryrun || node.dryrun

        var { err: sourceErr, value: source } = await getArray("source", node.source, node.sourceType, msg); 
        var { err: destinationErr, value: destination } = await getArray("destination", node.destination, node.destinationType, msg); 
        var { err: excludeErr, value: exclude } = await getArray("exclude", node.exclude, node.excludeType, msg)
        var { err: includeErr, value: include } = await getArray("include", node.include, node.includeType, msg)
        var verbose = useVerbose === true
        var recursive = useRecursive === true
        var dryrun = useDryrun === true
        var { err: extraErr, value: extra } = await getArray("extra", node.extra, node.extraType, msg)

        var errs = [sourceErr, destinationErr, excludeErr, includeErr, extraErr]
            .filter(err => err !== null)
        if (errs.length > 0) {
            debug(errs.length+" errors found")
            done(errs, msg);
            return
        }

        var args = []
        if (verbose === true) args.push('-v')
        if (source.find( el => el.indexOf("./") >= 0)) args.push('--relative')

        var command = {
            src: source,
            dest: destination[0] || "",
            exclude: exclude,
            include: include,
            recursive: recursive,
            dryRun: dryrun,
            args: args.concat(extra),
        }

        rsync(command, function(error, stdout, stderr, cmd) {
            if (error !== null) msg.error = error
            if (stdout !== "") msg.stdout = stdout
            if (stderr !== "") msg.stderr = stderr
            msg.cmd = cmd
            msg.rsync = command
            if (error) {
                done([error], msg)
            } else {
                done([], msg)
            }
        })
    }

    async function getArray(name, input, inputType, msg) {
        if ((input === null) || (input === undefined)) {
            return { err: null, value: null }
        } else if (['msg', 'flow', 'global'].includes(inputType)) {
            try {
                var value = await getProperty(name, input, inputType, msg)
                return { err: null, value: (Array.isArray(value) ? value : [value]) }
            } catch (e) {
                return { err: e, value: null }
            }
        } else if (inputType === "jsonata") {
            var expr = RED.util.prepareJSONataExpression(input, this);
            try {
                var value = await getJSONata(name, input, msg)
                return { err: null, value: (Array.isArray(value) ? value : [value]) }
            } catch (e) {
                return { err: e, value: null }
            }
        } else {
            return { err: null, value: [String(input)] }
        }
    }

    function getProperty(name, input, inputType, msg) {
        return new Promise((resolve, reject) => {
            RED.util.evaluateNodeProperty(input, inputType, this, msg, function(err, res) {
                if (err) {
                    reject( { error: err.message })
                } else {
                    resolve(res)
                }
            });
        });
    }

    function getJSONata(name, input, msg) {
        var expr = RED.util.prepareJSONataExpression(input, this);
        return new Promise((resolve, reject) => {
            RED.util.evaluateJSONataExpression(expr, msg, (err, value) => {
                if (err) {
                    reject( { error: err.message })
                } else {
                    resolve(value)
                }
            });            
        }) 
    }

    function debug(msg) {
        if (debugNode) debugNode.warn(msg)
    }
}
