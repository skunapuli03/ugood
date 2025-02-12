import React from "react";
import { motion } from "motion/react";

const cardVariants = {
    hidden: { opacity: 0, y: 20},
    visible: { opacity: 1, y: 0},
};

//making the LessonCard Component
function LessonCardAnimated({lessonText, tasks}){
    return(
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <div className="card">
                <h3>Lesson</h3>
                <p>{lessonText}</p>

                {tasks && tasks.length > 0 && (
                    <><h3>Tasks</h3><ul>
                        {tasks.map((task, index) => (
                            <li key={index}>{task}</li>
                        ))}
                    </ul></>
                )}

            </div>
        </motion.div>
    );

}

export default LessonCardAnimated;