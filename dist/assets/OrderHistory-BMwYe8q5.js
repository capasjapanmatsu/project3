import{u as e,b as s,j as a,B as t}from"./index-Dp3tQatg.js";import{b as n,r as l,L as r}from"./vendor-Cwmn0chA.js";import{C as c}from"./Card-CPEZwr97.js";import{O as i,w as d,U as m,v as o,H as x,h,i as p,l as j,ad as u,q as g,E as N,o as b,X as f,ac as v}from"./ui-BHmKMuva.js";import"./supabase-Dzr8oIt2.js";function _(){var _;const{user:y}=e(),w=n(),[S,L]=l.useState([]),[k,C]=l.useState(!0),[D,$]=l.useState(null),[z,T]=l.useState(!1),[E,q]=l.useState(!1),[J,P]=l.useState(null),[M,I]=l.useState(null),[O,U]=l.useState(null);l.useEffect((()=>{var e;if(y){A();const e=setInterval((()=>{B()}),6e4);return()=>clearInterval(e)}(null==(e=w.state)?void 0:e.orderSuccess)&&(T(!0),setTimeout((()=>T(!1)),5e3))}),[y,w]);const A=async()=>{try{const{data:e,error:a}=await s.from("orders").select("\n          *,\n          order_items (\n            *,\n            product:products (*)\n          )\n        ").eq("user_id",null==y?void 0:y.id).order("created_at",{ascending:!1});if(a)throw a;const t=(e||[]).map((e=>{const s=e.cancellable_until?new Date(e.cancellable_until):null,a=new Date,t=s&&a<s&&["pending","confirmed"].includes(e.status);let n;if(t&&s){const e=s.getTime()-a.getTime();n=`${Math.floor(e/6e4)}分${Math.floor(e%6e4/1e3)}秒`}return{...e,can_cancel:t,time_left:n}}));L(t)}catch(e){}finally{C(!1)}},B=()=>{const e=new Date;L((s=>s.map((s=>{const a=s.cancellable_until?new Date(s.cancellable_until):null,t=a&&e<a&&["pending","confirmed"].includes(s.status);let n;if(t&&a){const s=a.getTime()-e.getTime();n=`${Math.floor(s/6e4)}分${Math.floor(s%6e4/1e3)}秒`}return{...s,can_cancel:t,time_left:n}}))))},R=e=>{switch(e){case"pending":return a.jsx(g,{className:"w-5 h-5 text-yellow-600"});case"confirmed":return a.jsx(p,{className:"w-5 h-5 text-blue-600"});case"processing":return a.jsx(d,{className:"w-5 h-5 text-purple-600"});case"shipped":return a.jsx(v,{className:"w-5 h-5 text-orange-600"});case"delivered":return a.jsx(p,{className:"w-5 h-5 text-green-600"});case"cancelled":return a.jsx(f,{className:"w-5 h-5 text-red-600"});default:return a.jsx(g,{className:"w-5 h-5 text-gray-600"})}},H=e=>({pending:"注文受付中",confirmed:"注文確定",processing:"準備中",shipped:"発送済み",delivered:"配達完了",cancelled:"キャンセル"}[e]||e),V=e=>({credit_card:"クレジットカード",bank_transfer:"銀行振込",cod:"代金引換"}[e]||e);return k?a.jsx("div",{className:"flex justify-center items-center h-64",children:a.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"})}):a.jsxs("div",{className:"max-w-6xl mx-auto",children:[a.jsx("div",{className:"flex items-center space-x-4 mb-6",children:a.jsxs(r,{to:"/dashboard",className:"flex items-center text-gray-600 hover:text-gray-800 transition-colors",children:[a.jsx(i,{className:"w-4 h-4 mr-2"}),"ダッシュボードに戻る"]})}),a.jsxs("h1",{className:"text-2xl font-bold mb-8 flex items-center",children:[a.jsx(d,{className:"w-8 h-8 text-green-600 mr-3"}),"注文履歴"]}),a.jsxs("div",{className:"flex flex-wrap gap-4 mb-6",children:[a.jsx(r,{to:"/profile-settings",children:a.jsxs(t,{variant:"secondary",size:"sm",children:[a.jsx(m,{className:"w-4 h-4 mr-2"}),"プロフィール編集"]})}),a.jsx(r,{to:"/payment-method-settings",children:a.jsxs(t,{variant:"secondary",size:"sm",children:[a.jsx(o,{className:"w-4 h-4 mr-2"}),"支払い方法"]})}),a.jsx(r,{to:"/dogpark-history",children:a.jsxs(t,{variant:"secondary",size:"sm",children:[a.jsx(x,{className:"w-4 h-4 mr-2"}),"ドッグラン利用履歴"]})}),a.jsx(r,{to:"/shop",children:a.jsxs(t,{variant:"secondary",size:"sm",children:[a.jsx(h,{className:"w-4 h-4 mr-2"}),"ショップに戻る"]})})]}),z&&(null==(_=w.state)?void 0:_.orderNumber)&&a.jsxs("div",{className:"mb-6 p-4 bg-green-100 border border-green-300 rounded-lg",children:[a.jsxs("div",{className:"flex items-center space-x-2",children:[a.jsx(p,{className:"w-5 h-5 text-green-600"}),a.jsx("span",{className:"font-semibold text-green-800",children:"ご注文ありがとうございます！"})]}),a.jsxs("p",{className:"text-green-700 mt-1",children:["注文番号: ",w.state.orderNumber," のご注文を承りました。"]})]}),M&&a.jsx("div",{className:"mb-6 p-4 bg-green-100 border border-green-300 rounded-lg",children:a.jsxs("div",{className:"flex items-center space-x-2",children:[a.jsx(p,{className:"w-5 h-5 text-green-600"}),a.jsx("span",{className:"font-semibold text-green-800",children:M})]})}),J&&a.jsxs("div",{className:"mb-6 p-4 bg-red-100 border border-red-300 rounded-lg",children:[a.jsxs("div",{className:"flex items-center space-x-2",children:[a.jsx(j,{className:"w-5 h-5 text-red-600"}),a.jsx("span",{className:"font-semibold text-red-800",children:"エラー"})]}),a.jsx("p",{className:"text-red-700 mt-1",children:J})]}),0===S.length?a.jsxs(c,{className:"text-center py-12",children:[a.jsx(d,{className:"w-16 h-16 text-gray-400 mx-auto mb-4"}),a.jsx("h2",{className:"text-xl font-semibold text-gray-700 mb-2",children:"注文履歴がありません"}),a.jsx("p",{className:"text-gray-500 mb-6",children:"まだ商品をご注文いただいていません"}),a.jsx(t,{onClick:()=>window.location.href="/shop",children:"ショッピングを始める"})]}):a.jsxs("div",{className:"space-y-6",children:[a.jsx("div",{className:"flex justify-end mb-4",children:a.jsxs(t,{variant:"secondary",size:"sm",onClick:()=>{if(0===S.length)return;const e=["注文番号","注文日","ステータス","商品名","数量","単価","小計","割引","送料","合計金額","支払い方法","配送先氏名","配送先住所","配送先電話番号"].join(","),s=[];S.forEach((e=>{const a=new Date(e.created_at).toLocaleDateString("ja-JP"),t=H(e.status),n=V(e.payment_method);if(e.order_items&&e.order_items.length>0)e.order_items.forEach(((l,r)=>{const c=[e.order_number,a,t,`"${l.product.name.replace(/"/g,'""')}"`,l.quantity,l.unit_price,l.total_price,0===r?e.discount_amount:"",0===r?e.shipping_fee:"",0===r?e.final_amount:"",0===r?n:"",0===r?`"${e.shipping_name.replace(/"/g,'""')}"`:"",0===r?`"${e.shipping_address.replace(/"/g,'""')}"`:"",0===r?e.shipping_phone:""].join(",");s.push(c)}));else{const l=[e.order_number,a,t,"商品なし","","","",e.discount_amount,e.shipping_fee,e.final_amount,n,`"${e.shipping_name.replace(/"/g,'""')}"`,`"${e.shipping_address.replace(/"/g,'""')}"`,e.shipping_phone].join(",");s.push(l)}}));const a="\ufeff"+[e,...s].join("\n"),t=new Blob([a],{type:"text/csv;charset=utf-8;"}),n=URL.createObjectURL(t),l=document.createElement("a");l.setAttribute("href",n),l.setAttribute("download",`注文履歴_${(new Date).toISOString().split("T")[0]}.csv`),l.style.visibility="hidden",document.body.appendChild(l),l.click(),document.body.removeChild(l)},children:[a.jsx(u,{className:"w-4 h-4 mr-2"}),"CSV出力"]})}),S.map((e=>{return a.jsxs(c,{className:"p-6",children:[a.jsxs("div",{className:"flex justify-between items-start mb-4",children:[a.jsxs("div",{children:[a.jsxs("div",{className:"flex items-center space-x-3 mb-2",children:[a.jsxs("h3",{className:"text-lg font-semibold",children:["注文番号: ",e.order_number]}),a.jsxs("div",{className:`flex items-center space-x-1 px-2 py-1 rounded-full text-sm ${s=e.status,{pending:"text-yellow-600 bg-yellow-100",confirmed:"text-blue-600 bg-blue-100",processing:"text-purple-600 bg-purple-100",shipped:"text-orange-600 bg-orange-100",delivered:"text-green-600 bg-green-100",cancelled:"text-red-600 bg-red-100"}[s]||"text-gray-600 bg-gray-100"}`,children:[R(e.status),a.jsx("span",{children:H(e.status)})]}),e.can_cancel&&a.jsxs("div",{className:"text-xs text-orange-600 flex items-center",children:[a.jsx(g,{className:"w-3 h-3 mr-1"}),"キャンセル可能: あと",e.time_left]})]}),a.jsxs("p",{className:"text-gray-600 text-sm",children:["注文日: ",new Date(e.created_at).toLocaleDateString("ja-JP")]}),e.estimated_delivery_date&&a.jsxs("p",{className:"text-gray-600 text-sm",children:["お届け予定日: ",new Date(e.estimated_delivery_date).toLocaleDateString("ja-JP")]})]}),a.jsxs("div",{className:"text-right",children:[a.jsxs("p",{className:"text-2xl font-bold text-green-600",children:["¥",e.final_amount.toLocaleString()]}),a.jsx("p",{className:"text-sm text-gray-500",children:V(e.payment_method)})]})]}),a.jsxs("div",{className:"space-y-3 mb-4",children:[e.order_items.slice(0,3).map((e=>a.jsxs("div",{className:"flex items-center space-x-4 bg-gray-50 p-3 rounded-lg",children:[a.jsx("img",{src:e.product.image_url,alt:e.product.name,className:"w-16 h-16 object-cover rounded",onError:e=>{e.currentTarget.src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg"}}),a.jsxs("div",{className:"flex-1",children:[a.jsx("h4",{className:"font-medium",children:e.product.name}),a.jsxs("p",{className:"text-sm text-gray-600",children:["数量: ",e.quantity," × ¥",e.unit_price.toLocaleString()]})]}),a.jsxs("p",{className:"font-medium",children:["¥",e.total_price.toLocaleString()]})]},e.id))),e.order_items.length>3&&a.jsxs("p",{className:"text-sm text-gray-500 text-center",children:["他 ",e.order_items.length-3," 点"]})]}),a.jsxs("div",{className:"bg-blue-50 p-3 rounded-lg mb-4",children:[a.jsx("h4",{className:"font-semibold text-blue-900 mb-1",children:"配送先"}),a.jsxs("p",{className:"text-sm text-blue-800",children:[e.shipping_name,a.jsx("br",{}),"〒",e.shipping_postal_code,a.jsx("br",{}),e.shipping_address,a.jsx("br",{}),e.shipping_phone]})]}),e.tracking_number&&a.jsxs("div",{className:"bg-orange-50 p-3 rounded-lg mb-4",children:[a.jsx("h4",{className:"font-semibold text-orange-900 mb-1",children:"配送追跡"}),a.jsxs("p",{className:"text-sm text-orange-800",children:["追跡番号: ",e.tracking_number]})]}),a.jsxs("div",{className:"flex justify-between items-center",children:[a.jsxs("div",{className:"flex space-x-2",children:[a.jsxs(t,{variant:"secondary",size:"sm",onClick:()=>$(e),children:[a.jsx(N,{className:"w-4 h-4 mr-1"}),"詳細を見る"]}),"delivered"===e.status&&a.jsxs(t,{variant:"secondary",size:"sm",onClick:()=>{alert("レビュー機能は準備中です")},children:[a.jsx(b,{className:"w-4 h-4 mr-1"}),"レビューを書く"]})]}),e.can_cancel&&a.jsxs(t,{variant:"secondary",size:"sm",className:"text-red-600 hover:text-red-700",onClick:()=>U(e.id),children:[a.jsx(f,{className:"w-4 h-4 mr-1"}),"キャンセル"]})]})]},e.id);var s}))]}),D&&a.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50",children:a.jsx("div",{className:"bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto",children:a.jsxs("div",{className:"p-6",children:[a.jsxs("div",{className:"flex justify-between items-center mb-6",children:[a.jsx("h2",{className:"text-xl font-bold",children:"注文詳細"}),a.jsx("button",{onClick:()=>$(null),className:"text-gray-500 hover:text-gray-700",children:a.jsx(f,{className:"w-6 h-6"})})]}),a.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6 mb-6",children:[a.jsxs("div",{children:[a.jsx("h3",{className:"font-semibold mb-3",children:"注文情報"}),a.jsxs("div",{className:"space-y-2 text-sm",children:[a.jsxs("p",{children:[a.jsx("span",{className:"font-medium",children:"注文番号:"})," ",D.order_number]}),a.jsxs("p",{children:[a.jsx("span",{className:"font-medium",children:"注文日:"})," ",new Date(D.created_at).toLocaleDateString("ja-JP")]}),a.jsxs("p",{children:[a.jsx("span",{className:"font-medium",children:"ステータス:"})," ",H(D.status)]}),a.jsxs("p",{children:[a.jsx("span",{className:"font-medium",children:"支払い方法:"})," ",V(D.payment_method)]}),D.estimated_delivery_date&&a.jsxs("p",{children:[a.jsx("span",{className:"font-medium",children:"お届け予定日:"})," ",new Date(D.estimated_delivery_date).toLocaleDateString("ja-JP")]}),D.can_cancel&&a.jsxs("div",{className:"mt-2 p-2 bg-orange-50 rounded-lg",children:[a.jsxs("p",{className:"text-orange-800 flex items-center",children:[a.jsx(g,{className:"w-4 h-4 mr-1"}),a.jsxs("span",{children:["キャンセル可能時間: あと",D.time_left]})]}),a.jsx("p",{className:"text-xs text-orange-700 mt-1",children:"注文から15分以内はキャンセル可能です"})]})]})]}),a.jsxs("div",{children:[a.jsx("h3",{className:"font-semibold mb-3",children:"配送先"}),a.jsxs("div",{className:"text-sm",children:[a.jsx("p",{className:"font-medium",children:D.shipping_name}),a.jsxs("p",{children:["〒",D.shipping_postal_code]}),a.jsx("p",{children:D.shipping_address}),a.jsx("p",{children:D.shipping_phone})]})]})]}),a.jsxs("div",{className:"mb-6",children:[a.jsx("h3",{className:"font-semibold mb-3",children:"注文商品"}),a.jsx("div",{className:"space-y-3",children:D.order_items.map((e=>a.jsxs("div",{className:"flex items-center space-x-4 border-b pb-3",children:[a.jsx("img",{src:e.product.image_url,alt:e.product.name,className:"w-16 h-16 object-cover rounded"}),a.jsxs("div",{className:"flex-1",children:[a.jsx("h4",{className:"font-medium",children:e.product.name}),a.jsxs("p",{className:"text-sm text-gray-600",children:["¥",e.unit_price.toLocaleString()," × ",e.quantity]})]}),a.jsxs("p",{className:"font-medium",children:["¥",e.total_price.toLocaleString()]})]},e.id)))})]}),a.jsxs("div",{className:"bg-gray-50 p-4 rounded-lg",children:[a.jsx("h3",{className:"font-semibold mb-3",children:"料金詳細"}),a.jsxs("div",{className:"space-y-2 text-sm",children:[a.jsxs("div",{className:"flex justify-between",children:[a.jsx("span",{children:"商品小計"}),a.jsxs("span",{children:["¥",D.total_amount.toLocaleString()]})]}),D.discount_amount>0&&a.jsxs("div",{className:"flex justify-between text-purple-600",children:[a.jsx("span",{children:"割引"}),a.jsxs("span",{children:["-¥",D.discount_amount.toLocaleString()]})]}),a.jsxs("div",{className:"flex justify-between",children:[a.jsx("span",{children:"送料"}),a.jsx("span",{children:0===D.shipping_fee?"無料":`¥${D.shipping_fee.toLocaleString()}`})]}),a.jsx("hr",{className:"my-2"}),a.jsxs("div",{className:"flex justify-between font-bold text-lg",children:[a.jsx("span",{children:"合計"}),a.jsxs("span",{className:"text-green-600",children:["¥",D.final_amount.toLocaleString()]})]})]})]}),a.jsxs("div",{className:"mt-6 flex justify-between",children:[a.jsx(t,{variant:"secondary",onClick:()=>$(null),children:"閉じる"}),D.can_cancel&&a.jsxs(t,{className:"bg-red-600 hover:bg-red-700",onClick:()=>{$(null),U(D.id)},children:[a.jsx(f,{className:"w-4 h-4 mr-2"}),"注文をキャンセル"]})]})]})})}),O&&a.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50",children:a.jsxs("div",{className:"bg-white rounded-lg max-w-md w-full p-6",children:[a.jsxs("div",{className:"text-center mb-6",children:[a.jsx(j,{className:"w-12 h-12 text-red-600 mx-auto mb-4"}),a.jsx("h2",{className:"text-xl font-bold text-gray-900 mb-2",children:"注文をキャンセルしますか？"}),a.jsx("p",{className:"text-gray-600",children:"この操作は取り消せません。本当にキャンセルしますか？"})]}),a.jsxs("div",{className:"flex justify-end space-x-3",children:[a.jsx(t,{variant:"secondary",onClick:()=>U(null),children:"戻る"}),a.jsx(t,{className:"bg-red-600 hover:bg-red-700",isLoading:E,onClick:()=>(async e=>{try{q(!0),P(null),I(null);const{data:a,error:t}=await s.rpc("cancel_order",{order_id:e,user_id:null==y?void 0:y.id});if(t)throw t;if(!a.success)throw new Error(a.message||"キャンセルに失敗しました");I("注文をキャンセルしました"),U(null),await A(),setTimeout((()=>{I(null)}),3e3)}catch(a){P("注文のキャンセルに失敗しました。")}finally{q(!1)}})(O),children:"キャンセルする"})]})]})})]})}export{_ as OrderHistory};
