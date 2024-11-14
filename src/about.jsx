import {Link} from "react-router-dom";
import './about.css';

/* Front-end for about page  */
function About() {


  return (
    <>
    <div className="about-container">
      <div className="mission-header">Our Mission</div>
        <h1 className="mission-desc">
        </h1>

        <div className="story-header">The Story</div>
        <h2 className="story-desc">
            <p><strong>Where It All Began:</strong> UGood started as a personal tool I created to help me reflect on my thoughts and experiences. Journaling helped me work through challenges, but sometimes, I felt I was missing a deeper understanding of the lessons I could learn.</p>
          
          <p><strong>The Realization:</strong> I began to see that growth doesn’t have to be a solo journey. There’s immense value in connecting with people who have faced similar struggles and come out stronger. Their stories and insights could add layers of wisdom to my reflections, making each lesson more impactful.</p>
          
          <p><strong>Building a Community:</strong> That’s when the idea for UGood expanded. It became more than just a journal. 
          UGood will now a space to not only learn from your experiences but also to connect with others who have walked similar paths, offering a sense of community and shared growth.</p>
          
          <p><strong>Our Vision:</strong> I want UGood to be a supportive space where you’re not only learning and growing on your own but also benefiting from the journeys of others. It will be a tool to help you overcome challenges with a little help from those who have been there too.</p>
        </h2>
      
      <Link to ="/entry">
        <button className='try-ugood'>
          Try UGood Free
        </button>
      </Link> 
    </div>  
    </>
  );
}

export default About;
