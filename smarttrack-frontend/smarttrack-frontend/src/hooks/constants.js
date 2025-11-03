import { useState, useEffect } from 'react'


export default function useAuth(){
const [user, setUser] = useState(()=> JSON.parse(localStorage.getItem('user') || 'null'))
useEffect(()=>{
const onStorage = ()=> setUser(JSON.parse(localStorage.getItem('user') || 'null'))
window.addEventListener('storage', onStorage)
return ()=> window.removeEventListener('storage', onStorage)
},[])
return { user }
}