function b(t,n,c){const s="\uFEFF",d=t.map(o).join(","),i=n.map(l=>l.map(p=>o(p.toString())).join(",")),a=s+[d,...i].join(`
`),r=new Blob([a],{type:"text/csv;charset=utf-8;"}),u=URL.createObjectURL(r),e=document.createElement("a");e.setAttribute("href",u),e.setAttribute("download",c),e.style.visibility="hidden",document.body.appendChild(e),e.click(),document.body.removeChild(e)}function o(t){return t.includes('"')||t.includes(",")||t.includes(`
`)||t.includes("\r")?`"${t.replace(/"/g,'""')}"`:t}export{b as d};
