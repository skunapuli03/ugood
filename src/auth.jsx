import React, {useState, useEffect} from "react";
import {Link} from "react-router-dom";
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import Entry from "./entry";


const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co"
const supabase = createClient(supabaseUrl, supabaseKey)
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
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }}  />
      </div>
      )
    }
    else {//this else condition renders when the user is logged in 
    
      return (<Entry/>) //import the full journal features/components into here + adjust the css to the webpage

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
