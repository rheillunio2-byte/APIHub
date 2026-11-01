export default function PageHeader({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:React.ReactNode}) {
 return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
