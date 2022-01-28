var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z = "table.svelte-11br7cv td.svelte-11br7cv,th.svelte-11br7cv.svelte-11br7cv{max-width:500px}td.svelte-11br7cv.svelte-11br7cv,a.svelte-11br7cv.svelte-11br7cv{word-wrap:break-word}";
    styleInject(css_248z);

    /* current/src/js/similar-list.svelte generated by Svelte v3.45.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (1:0) <script>   let siteInfos = [];   let siteInfoFragments = [];   let page = 1;   let maxPage = 0;   let row = 30;   let detailVisibility = false;   let promise = fetch("./site-info.json")     .then(r => r.json())     .then(data=>{       siteInfos = data;       siteInfoFragments = data.slice(0,row);       maxPage = Math.ceil(data.length/row);     }
    function create_catch_block(ctx) {
    	return { c: noop, m: noop, p: noop, d: noop };
    }

    // (62:0) {:then dummy}
    function create_then_block(ctx) {
    	let div4;
    	let header;
    	let h1;
    	let t1;
    	let div3;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let div1;
    	let div0;
    	let button0;
    	let t6_value = (/*detailVisibility*/ ctx[3] ? "続きを非表示" : "...続きを読む") + "";
    	let t6;
    	let t7;
    	let div2;
    	let p2;
    	let div2_class_value;
    	let t9;
    	let nav;
    	let div9;
    	let div5;
    	let t11;
    	let div7;
    	let div6;
    	let input;
    	let t12;
    	let div8;
    	let t13;
    	let t14;
    	let t15;
    	let div12;
    	let div10;
    	let button1;
    	let t16;
    	let button1_disabled_value;
    	let t17;
    	let div11;
    	let button2;
    	let t18;
    	let button2_disabled_value;
    	let t19;
    	let div13;
    	let table;
    	let thead;
    	let t25;
    	let tbody;
    	let t26;
    	let tfoot;
    	let mounted;
    	let dispose;
    	let each_value = /*siteInfoFragments*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div4 = element("div");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "コンテンツと類似するコンテンツをdoc2vecで求める";
    			t1 = space();
    			div3 = element("div");
    			p0 = element("p");
    			p0.textContent = "自サーバーのコンテンツ分析を行っており、doc2vecを用いて、自サーバーのコンテンツと類似するコンテンツを求めることによって関連コンテンツの自動リンク設定や、分類ができないか試しています。";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "このリストは、sfpgmr.netサイト内のコンテンツ同士の類似度をdoc2vecで求めた結果です。1つのコンテンツに対して類似度を求め、類似度が0.8以上のものを類似度が高い順から最大10個表示するようにしています。";
    			t5 = space();
    			div1 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			t6 = text(t6_value);
    			t7 = space();
    			div2 = element("div");
    			p2 = element("p");
    			p2.textContent = "以下のステップで作成しています。";
    			t9 = space();
    			nav = element("nav");
    			div9 = element("div");
    			div5 = element("div");
    			div5.innerHTML = `<p class="subtitle">Page</p>`;
    			t11 = space();
    			div7 = element("div");
    			div6 = element("div");
    			input = element("input");
    			t12 = space();
    			div8 = element("div");
    			t13 = text("/");
    			t14 = text(/*maxPage*/ ctx[2]);
    			t15 = space();
    			div12 = element("div");
    			div10 = element("div");
    			button1 = element("button");
    			t16 = text("＜");
    			t17 = space();
    			div11 = element("div");
    			button2 = element("button");
    			t18 = text("＞");
    			t19 = space();
    			div13 = element("div");
    			table = element("table");
    			thead = element("thead");

    			thead.innerHTML = `<tr><th class="svelte-11br7cv">コンテンツ</th> 
        <th class="svelte-11br7cv">類似コンテンツ</th> 
        <th class="svelte-11br7cv">類似度(0.0-1.0)</th></tr>`;

    			t25 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t26 = space();
    			tfoot = element("tfoot");

    			tfoot.innerHTML = `<tr><th class="svelte-11br7cv">コンテンツ</th> 
      <th class="svelte-11br7cv">類似コンテンツ</th> 
      <th class="svelte-11br7cv">類似度(0.0-1.0)</th></tr>`;

    			attr(h1, "class", "title");
    			attr(button0, "class", "button is-info");
    			attr(div0, "class", "column is-narrow");
    			attr(div1, "class", "columns is-centered");
    			attr(div2, "class", div2_class_value = !/*detailVisibility*/ ctx[3] ? "is-hidden" : "");
    			attr(div3, "class", "block");
    			attr(header, "class", "hero-body");
    			attr(div4, "class", "hero");
    			attr(div5, "class", "level-item");
    			attr(input, "size", "10");
    			attr(input, "class", "input");
    			attr(div6, "class", "control");
    			attr(div7, "class", "level-item");
    			attr(div8, "class", "level-item");
    			attr(div9, "class", "level-left");
    			attr(button1, "class", "button");
    			button1.disabled = button1_disabled_value = /*page*/ ctx[1] <= 1;
    			attr(div10, "class", "level-item");
    			attr(button2, "class", "button");
    			button2.disabled = button2_disabled_value = /*page*/ ctx[1] == /*maxPage*/ ctx[2];
    			attr(div11, "class", "level-item");
    			attr(div12, "class", "level-left");
    			attr(nav, "class", "level");
    			attr(table, "class", "table is-bordered is-striped is-fullwidth svelte-11br7cv");
    			attr(div13, "class", "table-container");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, header);
    			append(header, h1);
    			append(header, t1);
    			append(header, div3);
    			append(div3, p0);
    			append(div3, t3);
    			append(div3, p1);
    			append(div3, t5);
    			append(div3, div1);
    			append(div1, div0);
    			append(div0, button0);
    			append(button0, t6);
    			append(div3, t7);
    			append(div3, div2);
    			append(div2, p2);
    			insert(target, t9, anchor);
    			insert(target, nav, anchor);
    			append(nav, div9);
    			append(div9, div5);
    			append(div9, t11);
    			append(div9, div7);
    			append(div7, div6);
    			append(div6, input);
    			set_input_value(input, /*page*/ ctx[1]);
    			append(div9, t12);
    			append(div9, div8);
    			append(div8, t13);
    			append(div8, t14);
    			append(nav, t15);
    			append(nav, div12);
    			append(div12, div10);
    			append(div10, button1);
    			append(button1, t16);
    			append(div12, t17);
    			append(div12, div11);
    			append(div11, button2);
    			append(button2, t18);
    			insert(target, t19, anchor);
    			insert(target, div13, anchor);
    			append(div13, table);
    			append(table, thead);
    			append(table, t25);
    			append(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append(table, t26);
    			append(table, tfoot);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", prevent_default(/*detailVisibilityButtonClick*/ ctx[8])),
    					listen(input, "input", /*input_input_handler*/ ctx[9]),
    					listen(input, "change", /*setPage*/ ctx[7]),
    					listen(button1, "click", /*pageUp*/ ctx[5]),
    					listen(button2, "click", /*pageDown*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*detailVisibility*/ 8 && t6_value !== (t6_value = (/*detailVisibility*/ ctx[3] ? "続きを非表示" : "...続きを読む") + "")) set_data(t6, t6_value);

    			if (dirty & /*detailVisibility*/ 8 && div2_class_value !== (div2_class_value = !/*detailVisibility*/ ctx[3] ? "is-hidden" : "")) {
    				attr(div2, "class", div2_class_value);
    			}

    			if (dirty & /*page*/ 2 && input.value !== /*page*/ ctx[1]) {
    				set_input_value(input, /*page*/ ctx[1]);
    			}

    			if (dirty & /*maxPage*/ 4) set_data(t14, /*maxPage*/ ctx[2]);

    			if (dirty & /*page*/ 2 && button1_disabled_value !== (button1_disabled_value = /*page*/ ctx[1] <= 1)) {
    				button1.disabled = button1_disabled_value;
    			}

    			if (dirty & /*page, maxPage*/ 6 && button2_disabled_value !== (button2_disabled_value = /*page*/ ctx[1] == /*maxPage*/ ctx[2])) {
    				button2.disabled = button2_disabled_value;
    			}

    			if (dirty & /*siteInfoFragments*/ 1) {
    				each_value = /*siteInfoFragments*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			if (detaching) detach(t9);
    			if (detaching) detach(nav);
    			if (detaching) detach(t19);
    			if (detaching) detach(div13);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (112:2) {#each siteInfoFragments as content }
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let div0;
    	let a0;
    	let t0_value = /*content*/ ctx[12].contentId + "";
    	let t0;
    	let t1;
    	let t2_value = (/*content*/ ctx[12].contentTitle || 'タイトルなし') + "";
    	let t2;
    	let br0;
    	let t3;
    	let t4_value = /*content*/ ctx[12].contentPath + "";
    	let t4;
    	let a0_href_value;
    	let t5;
    	let div1;
    	let t6_value = (/*content*/ ctx[12].contentDescription || '説明なし') + "";
    	let t6;
    	let t7;
    	let td1;
    	let div2;
    	let a1;
    	let t8_value = /*content*/ ctx[12].similarContentID + "";
    	let t8;
    	let t9;
    	let t10_value = (/*content*/ ctx[12].similarContentTitle || 'タイトルなし') + "";
    	let t10;
    	let t11;
    	let br1;
    	let t12;
    	let t13_value = /*content*/ ctx[12].similarContentPath + "";
    	let t13;
    	let a1_href_value;
    	let t14;
    	let div3;
    	let t15_value = (/*content*/ ctx[12].similarContentDescription || '説明なし') + "";
    	let t15;
    	let t16;
    	let td2;
    	let t17_value = /*content*/ ctx[12].similarity + "";
    	let t17;
    	let t18;

    	return {
    		c() {
    			tr = element("tr");
    			td0 = element("td");
    			div0 = element("div");
    			a0 = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			br0 = element("br");
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			t6 = text(t6_value);
    			t7 = space();
    			td1 = element("td");
    			div2 = element("div");
    			a1 = element("a");
    			t8 = text(t8_value);
    			t9 = space();
    			t10 = text(t10_value);
    			t11 = space();
    			br1 = element("br");
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			div3 = element("div");
    			t15 = text(t15_value);
    			t16 = space();
    			td2 = element("td");
    			t17 = text(t17_value);
    			t18 = space();
    			attr(a0, "href", a0_href_value = /*content*/ ctx[12].contentPath);
    			attr(a0, "target", "_blank");
    			attr(a0, "class", "svelte-11br7cv");
    			attr(td0, "class", "svelte-11br7cv");
    			attr(a1, "href", a1_href_value = /*content*/ ctx[12].similarContentPath);
    			attr(a1, "target", "_blank");
    			attr(a1, "class", "svelte-11br7cv");
    			attr(td1, "class", "svelte-11br7cv");
    			attr(td2, "class", "svelte-11br7cv");
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, div0);
    			append(div0, a0);
    			append(a0, t0);
    			append(a0, t1);
    			append(a0, t2);
    			append(a0, br0);
    			append(a0, t3);
    			append(a0, t4);
    			append(td0, t5);
    			append(td0, div1);
    			append(div1, t6);
    			append(tr, t7);
    			append(tr, td1);
    			append(td1, div2);
    			append(div2, a1);
    			append(a1, t8);
    			append(a1, t9);
    			append(a1, t10);
    			append(a1, t11);
    			append(a1, br1);
    			append(a1, t12);
    			append(a1, t13);
    			append(td1, t14);
    			append(td1, div3);
    			append(div3, t15);
    			append(tr, t16);
    			append(tr, td2);
    			append(td2, t17);
    			append(tr, t18);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*siteInfoFragments*/ 1 && t0_value !== (t0_value = /*content*/ ctx[12].contentId + "")) set_data(t0, t0_value);
    			if (dirty & /*siteInfoFragments*/ 1 && t2_value !== (t2_value = (/*content*/ ctx[12].contentTitle || 'タイトルなし') + "")) set_data(t2, t2_value);
    			if (dirty & /*siteInfoFragments*/ 1 && t4_value !== (t4_value = /*content*/ ctx[12].contentPath + "")) set_data(t4, t4_value);

    			if (dirty & /*siteInfoFragments*/ 1 && a0_href_value !== (a0_href_value = /*content*/ ctx[12].contentPath)) {
    				attr(a0, "href", a0_href_value);
    			}

    			if (dirty & /*siteInfoFragments*/ 1 && t6_value !== (t6_value = (/*content*/ ctx[12].contentDescription || '説明なし') + "")) set_data(t6, t6_value);
    			if (dirty & /*siteInfoFragments*/ 1 && t8_value !== (t8_value = /*content*/ ctx[12].similarContentID + "")) set_data(t8, t8_value);
    			if (dirty & /*siteInfoFragments*/ 1 && t10_value !== (t10_value = (/*content*/ ctx[12].similarContentTitle || 'タイトルなし') + "")) set_data(t10, t10_value);
    			if (dirty & /*siteInfoFragments*/ 1 && t13_value !== (t13_value = /*content*/ ctx[12].similarContentPath + "")) set_data(t13, t13_value);

    			if (dirty & /*siteInfoFragments*/ 1 && a1_href_value !== (a1_href_value = /*content*/ ctx[12].similarContentPath)) {
    				attr(a1, "href", a1_href_value);
    			}

    			if (dirty & /*siteInfoFragments*/ 1 && t15_value !== (t15_value = (/*content*/ ctx[12].similarContentDescription || '説明なし') + "")) set_data(t15, t15_value);
    			if (dirty & /*siteInfoFragments*/ 1 && t17_value !== (t17_value = /*content*/ ctx[12].similarity + "")) set_data(t17, t17_value);
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    		}
    	};
    }

    // (60:18)  <p>....ローディング中</p> {:then dummy}
    function create_pending_block(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "....ローディング中";
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let main;
    	let t0;
    	let footer;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 11
    	};

    	handle_promise(/*promise*/ ctx[4], info);

    	return {
    		c() {
    			main = element("main");
    			info.block.c();
    			t0 = space();
    			footer = element("footer");
    			footer.innerHTML = `<div class="content has-text-centered"><p><a href="https://sfpgmr.net/" class="svelte-11br7cv">© Satoshi Fujiwara</a>.</p></div>`;
    			attr(main, "class", "content");
    			attr(footer, "class", "footer");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    			insert(target, t0, anchor);
    			insert(target, footer, anchor);
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    			if (detaching) detach(t0);
    			if (detaching) detach(footer);
    		}
    	};
    }

    let row = 30;

    function instance($$self, $$props, $$invalidate) {
    	let siteInfos = [];
    	let siteInfoFragments = [];
    	let page = 1;
    	let maxPage = 0;
    	let detailVisibility = false;

    	let promise = fetch("./site-info.json").then(r => r.json()).then(data => {
    		siteInfos = data;
    		$$invalidate(0, siteInfoFragments = data.slice(0, row));
    		$$invalidate(2, maxPage = Math.ceil(data.length / row));
    	});

    	function pageUp() {
    		if (page == 1) {
    			return;
    		}

    		$$invalidate(1, page -= 1);
    		$$invalidate(0, siteInfoFragments = siteInfos.slice(page * row - row, page * row));
    	}

    	function pageDown() {
    		if (page >= maxPage) {
    			return;
    		}

    		$$invalidate(1, page += 1);
    		$$invalidate(0, siteInfoFragments = siteInfos.slice(page * row - row, page * row));
    	}

    	function setPage() {
    		if (page < 1) {
    			$$invalidate(1, page = 1);
    		}

    		if (page > maxPage) {
    			$$invalidate(1, page = maxPage);
    		}

    		$$invalidate(0, siteInfoFragments = siteInfos.slice(page * row - row, page * row));
    	}

    	function detailVisibilityButtonClick() {
    		$$invalidate(3, detailVisibility = !detailVisibility);
    	}

    	function input_input_handler() {
    		page = this.value;
    		$$invalidate(1, page);
    	}

    	return [
    		siteInfoFragments,
    		page,
    		maxPage,
    		detailVisibility,
    		promise,
    		pageUp,
    		pageDown,
    		setPage,
    		detailVisibilityButtonClick,
    		input_input_handler
    	];
    }

    class Similar_list extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const target = document.querySelector("#container");
    const app = new Similar_list({target: target});

    return app;

})();
