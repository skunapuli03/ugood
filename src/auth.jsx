import React, {useState, useEffect} from "react";
import {Link} from "react-router-dom";
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'


const supabaseKey = process.env.SUPABASE_KEY
const supabaseurl = process.env.SUPABASE_URL
const supabase = createClient( supabaseurl, supabaseKey)
//include option for user to enter his/her name
function AuthPage(){
    const [session, setSession] = useState(null)

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      return () => subscription.unsubscribe()
    }, [])
    
    if (!session) { // this right here renders the page if not logged in
      return (
      <div className="auth-container">
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={["google"]} />
      </div>
      )
    }
    else {//this else condition renders when the user is logged in 
    
      return (<div>Logged in!</div>) //import the full journal features/components into here
      /*the full journal components:
        user name at the top so a greeting like "happy to see you again {user name}"
        journal textarea to the right of the screen
        lessons and previews of previous journals to the left of the screen
        |
        ---> add a button that allows you to generate a 'what if' and regenerate the lesson to learn from
      */
    }
}

export default AuthPage;
