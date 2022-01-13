
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const { Error: Error_1 } = globals;
    const file = "src/App.svelte";

    // (73:6) {#if isCopiedToClipboard}
    function create_if_block_2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Image copied!";
    			add_location(span, file, 73, 8, 2873);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(73:6) {#if isCopiedToClipboard}",
    		ctx
    	});

    	return block;
    }

    // (79:4) {#if svgOutput}
    function create_if_block_1(ctx) {
    	let header;
    	let h2;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h2 = element("h2");
    			h2.textContent = "PNG";
    			add_location(h2, file, 79, 14, 2983);
    			add_location(header, file, 79, 6, 2975);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(79:4) {#if svgOutput}",
    		ctx
    	});

    	return block;
    }

    // (84:2) {#if svgOutput}
    function create_if_block(ctx) {
    	let section;
    	let header;
    	let h2;
    	let t1;
    	let html_tag;

    	const block = {
    		c: function create() {
    			section = element("section");
    			header = element("header");
    			h2 = element("h2");
    			h2.textContent = "SVG";
    			t1 = space();
    			add_location(h2, file, 85, 14, 3151);
    			add_location(header, file, 85, 6, 3143);
    			html_tag = new HtmlTag(null);
    			add_location(section, file, 84, 4, 3127);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, header);
    			append_dev(header, h2);
    			append_dev(section, t1);
    			html_tag.m(/*svgOutput*/ ctx[1], section);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*svgOutput*/ 2) html_tag.p(/*svgOutput*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(84:2) {#if svgOutput}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let section0;
    	let form;
    	let textarea;
    	let t4;
    	let button;
    	let t6;
    	let t7;
    	let section1;
    	let t8;
    	let canvas;
    	let t9;
    	let mounted;
    	let dispose;
    	let if_block0 = /*isCopiedToClipboard*/ ctx[3] && create_if_block_2(ctx);
    	let if_block1 = /*svgOutput*/ ctx[1] && create_if_block_1(ctx);
    	let if_block2 = /*svgOutput*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "svg2png";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Takes a SVG string and converts to transparent PNG";
    			t3 = space();
    			section0 = element("section");
    			form = element("form");
    			textarea = element("textarea");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Convert";
    			t6 = space();
    			if (if_block0) if_block0.c();
    			t7 = space();
    			section1 = element("section");
    			if (if_block1) if_block1.c();
    			t8 = space();
    			canvas = element("canvas");
    			t9 = space();
    			if (if_block2) if_block2.c();
    			add_location(h1, file, 63, 4, 2486);
    			add_location(p, file, 64, 4, 2507);
    			add_location(header, file, 62, 2, 2473);
    			attr_dev(textarea, "placeholder", "Paste SVG base64 URL here:\n<div style='background-image: data:image/svg+xml;base64,...'>\ndata:image/svg+xml;base64,...");
    			attr_dev(textarea, "class", "svelte-1h9f0my");
    			add_location(textarea, file, 68, 6, 2606);
    			add_location(button, file, 71, 6, 2789);
    			add_location(form, file, 67, 4, 2593);
    			add_location(section0, file, 66, 2, 2579);
    			attr_dev(canvas, "width", "600px");
    			attr_dev(canvas, "height", "600px");
    			add_location(canvas, file, 81, 4, 3019);
    			add_location(section1, file, 77, 2, 2939);
    			add_location(main, file, 61, 0, 2464);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, p);
    			append_dev(main, t3);
    			append_dev(main, section0);
    			append_dev(section0, form);
    			append_dev(form, textarea);
    			set_input_value(textarea, /*svgInput*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, button);
    			append_dev(form, t6);
    			if (if_block0) if_block0.m(form, null);
    			append_dev(main, t7);
    			append_dev(main, section1);
    			if (if_block1) if_block1.m(section1, null);
    			append_dev(section1, t8);
    			append_dev(section1, canvas);
    			/*canvas_binding*/ ctx[6](canvas);
    			append_dev(main, t9);
    			if (if_block2) if_block2.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[5]),
    					listen_dev(button, "click", /*convert*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*svgInput*/ 1) {
    				set_input_value(textarea, /*svgInput*/ ctx[0]);
    			}

    			if (/*isCopiedToClipboard*/ ctx[3]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(form, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*svgOutput*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(section1, t8);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*svgOutput*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(main, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			/*canvas_binding*/ ctx[6](null);
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function adjustSVG(svgStr) {
    	const container = document.createElement("div");
    	container.innerHTML = svgStr;
    	const svgEl = container.firstElementChild;
    	svgEl.setAttribute("width", "600");
    	svgEl.setAttribute("height", "600");
    	svgEl.setAttribute("viewBox", "0 0 600 600");
    	svgEl.querySelector("g").removeAttribute("transform");
    	return new XMLSerializer().serializeToString(svgEl);
    }

    function instance($$self, $$props, $$invalidate) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let svgInput;
    	let svgOutput;
    	let canvasElement;
    	let isCopiedToClipboard = false;

    	function copy() {
    		canvasElement.toBlob(
    			blob => {
    				let data = [new ClipboardItem({ [blob.type]: blob })];
    				navigator.clipboard.write(data).then(() => $$invalidate(3, isCopiedToClipboard = true));
    			},
    			"image/png"
    		);
    	}

    	function drawImage(svgStr) {
    		return new Promise(resolve => {
    				const ctx = canvasElement.getContext("2d");
    				ctx.clearRect(0, 0, 600, 600);
    				const img = new Image();
    				const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    				const imgUrl = URL.createObjectURL(svgBlob);

    				img.onload = function () {
    					ctx.drawImage(img, 0, 0);
    					resolve();
    				};

    				img.src = imgUrl;
    			});
    	}

    	function convert(e) {
    		var _a;

    		return __awaiter(this, void 0, void 0, function* () {
    			e.preventDefault();
    			const svgPattern = /data:image\/svg\+xml;base64,([\w+=]+)/;

    			const base64str = (_a = svgInput.match(svgPattern)) === null || _a === void 0
    			? void 0
    			: _a[1];

    			if (!base64str) {
    				throw new Error("Unable to find SVG base64 string");
    			}

    			const rawSvgStr = atob(base64str);
    			const svgStr = adjustSVG(rawSvgStr);
    			$$invalidate(1, svgOutput = svgStr);
    			yield drawImage(svgStr);
    			copy();
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function textarea_input_handler() {
    		svgInput = this.value;
    		$$invalidate(0, svgInput);
    	}

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvasElement = $$value;
    			$$invalidate(2, canvasElement);
    		});
    	}

    	$$self.$capture_state = () => ({
    		__awaiter,
    		svgInput,
    		svgOutput,
    		canvasElement,
    		isCopiedToClipboard,
    		copy,
    		adjustSVG,
    		drawImage,
    		convert
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("svgInput" in $$props) $$invalidate(0, svgInput = $$props.svgInput);
    		if ("svgOutput" in $$props) $$invalidate(1, svgOutput = $$props.svgOutput);
    		if ("canvasElement" in $$props) $$invalidate(2, canvasElement = $$props.canvasElement);
    		if ("isCopiedToClipboard" in $$props) $$invalidate(3, isCopiedToClipboard = $$props.isCopiedToClipboard);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		svgInput,
    		svgOutput,
    		canvasElement,
    		isCopiedToClipboard,
    		convert,
    		textarea_input_handler,
    		canvas_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
