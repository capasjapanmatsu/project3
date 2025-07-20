import{j as l,A as d,X as p,C as u,a as b}from"./ui-vendor-w2MLOks7.js";function w({status:i,size:e="md",showIcon:t=!0,showText:r=!0,className:n=""}){const c=s=>{switch(s){case"approved":return{icon:b,text:"承認済み",bgColor:"bg-green-100",textColor:"text-green-800",borderColor:"border-green-300",iconColor:"text-green-600",glow:"shadow-green-200 shadow-lg",pulse:"animate-pulse"};case"pending":return{icon:u,text:"審査中",bgColor:"bg-yellow-100",textColor:"text-yellow-800",borderColor:"border-yellow-300",iconColor:"text-yellow-600",glow:"shadow-yellow-200 shadow-md",pulse:""};case"rejected":return{icon:p,text:"却下",bgColor:"bg-red-100",textColor:"text-red-800",borderColor:"border-red-300",iconColor:"text-red-600",glow:"shadow-red-200 shadow-md",pulse:""};case"expired":return{icon:d,text:"期限切れ",bgColor:"bg-orange-100",textColor:"text-orange-800",borderColor:"border-orange-300",iconColor:"text-orange-600",glow:"shadow-orange-200 shadow-md",pulse:"animate-pulse"};case"none":default:return{icon:d,text:"未提出",bgColor:"bg-gray-100",textColor:"text-gray-800",borderColor:"border-gray-300",iconColor:"text-gray-600",glow:"",pulse:""}}},g=s=>{switch(s){case"sm":return{padding:"px-2 py-1",textSize:"text-xs",iconSize:"w-3 h-3",gap:"gap-1"};case"lg":return{padding:"px-4 py-2",textSize:"text-base",iconSize:"w-6 h-6",gap:"gap-3"};case"md":default:return{padding:"px-3 py-1.5",textSize:"text-sm",iconSize:"w-4 h-4",gap:"gap-2"}}},o=c(i),a=g(e),x=o.icon;return l.jsxs("div",{className:`
      inline-flex items-center font-medium rounded-full border-2
      ${o.bgColor} 
      ${o.textColor} 
      ${o.borderColor}
      ${o.glow}
      ${o.pulse}
      ${a.padding}
      ${a.textSize}
      ${a.gap}
      ${n}
    `,children:[t&&l.jsx(x,{className:`${a.iconSize} ${o.iconColor}`}),r&&l.jsx("span",{className:"font-semibold",children:o.text})]})}function m(i){const e=i.vaccine_certifications?.[0];if(!e)return"none";const t=new Date,r=e.rabies_expiry_date?new Date(e.rabies_expiry_date):null,n=e.combo_expiry_date?new Date(e.combo_expiry_date):null;return e.status==="approved"?r&&r<t||n&&n<t?"expired":"approved":e.status||"none"}export{w as V,m as g};
