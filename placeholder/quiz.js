/* Shared quiz renderer
   - Looks for a global `questionsData` array (declared per-quiz file) OR tries to parse a <script> that contains it.
   - Renders all questions together, randomises question order, shows correct/incorrect and explanation at end.
   - Minimal, dependency-free JavaScript.
*/

(function () {
    // safe evaluator: try to locate questions data in global scope or in script tags
    function findQuestionsData() {
        // Prefer explicit globals
        if (window.questionsData && Array.isArray(window.questionsData)) return window.questionsData;
        if (window.questions && Array.isArray(window.questions)) return window.questions;

        // search for a script tag that contains 'questionsData' or 'questions' assignment
        const scripts = Array.from(document.getElementsByTagName('script'));
        for (const s of scripts) {
            const txt = s.textContent || '';
            let m = txt.match(/questionsData\s*=\s*(\[([\s\S]*?)\])\s*;/m);
            if (!m) m = txt.match(/\bquestions\s*=\s*(\[([\s\S]*?)\])\s*;/m);
            if (m && m[1]) {
                try {
                    let jsonLike = m[1].replace(/\r|\n/g, ' ');
                    try { return JSON.parse(jsonLike); } catch (e) {
                        try { return (new Function('return ' + jsonLike))(); } catch (e2) { continue; }
                    }
                } catch (e) { continue }
            }
        }
        return null;
    }

    function shuffleArray(array) {
        const a = array.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function renderQuiz(questions) {
        // support either #quiz-container or #questions-container
        let container = document.getElementById('quiz-container');
        const altContainer = document.getElementById('questions-container');
        if (!container && altContainer) container = altContainer;
        if (!container) {
            // create container if absent
            const wrapper = document.createElement('div'); wrapper.className = 'quiz-wrapper';
            const el = document.createElement('div'); el.id = 'quiz-container'; wrapper.appendChild(el);
            document.body.insertBefore(wrapper, document.body.firstChild);
            container = document.getElementById('quiz-container');
        }

        // randomize questions
        const randomized = shuffleArray(questions.map((q, i) => Object.assign({}, q, { __origIndex: i })));
        // keep options order but could be randomised if needed

        window.__quizUserAnswers = new Array(randomized.length).fill(null);

        function buildQuestion(q, idx) {
            const div = document.createElement('div'); div.className = 'question'; div.id = `question-${idx}`;
            const qnum = document.createElement('div'); qnum.className = 'question-number'; qnum.textContent = `Question ${idx + 1} of ${randomized.length}`;
            const qtext = document.createElement('div'); qtext.className = 'question-text'; qtext.innerHTML = q.question;
            const opts = document.createElement('div'); opts.className = 'options';
            q.options.forEach((opt, oi) => {
                const o = document.createElement('div'); o.className = 'option'; o.setAttribute('data-question', idx); o.setAttribute('data-option', oi); o.innerHTML = opt;
                o.addEventListener('click', function (e) {
                    // deselect
                    opts.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
                    o.classList.add('selected');
                    window.__quizUserAnswers[idx] = oi;
                });
                opts.appendChild(o);
            });
            const expl = document.createElement('div'); expl.className = 'explanation'; expl.id = `explanation-${idx}`; expl.innerHTML = `<strong>Explanation:</strong> ${q.explanation || 'No explanation provided.'}`;
            div.appendChild(qnum); div.appendChild(qtext); div.appendChild(opts); div.appendChild(expl);
            return div;
        }

        const cont = document.getElementById('quiz-container'); cont.innerHTML = '';
        randomized.forEach((q, i) => cont.appendChild(buildQuestion(q, i)));

        // ensure submit button exists
        let submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) {
            const sc = document.createElement('div'); sc.className = 'submit-container';
            submitBtn = document.createElement('button'); submitBtn.className = 'btn'; submitBtn.id = 'submitBtn'; submitBtn.textContent = 'Submit Quiz';
            sc.appendChild(submitBtn); cont.parentNode.insertBefore(sc, cont.nextSibling);
        }

        submitBtn.onclick = function () {
            // require all answered
            if (window.__quizUserAnswers.includes(null)) {
                alert('Please answer all questions before submitting.'); return;
            }
            let correct = 0;
            randomized.forEach((q, idx) => {
                const correctIndex = q.correct;
                const opts = document.querySelectorAll(`#question-${idx} .option`);
                opts.forEach((optEl, oIndex) => {
                    optEl.style.cursor = 'default'; optEl.onclick = null;
                    if (oIndex === correctIndex) optEl.classList.add('correct');
                    else if (window.__quizUserAnswers[idx] === oIndex) optEl.classList.add('incorrect');
                });
                if (window.__quizUserAnswers[idx] === correctIndex) correct++;
                document.getElementById(`explanation-${idx}`).classList.add('show');
            });

            const perc = Math.round((correct / randomized.length) * 100);
            let feedback = '';
            if (perc >= 90) feedback = 'Excellent work!'; else if (perc >= 80) feedback = 'Very good.'; else if (perc >= 70) feedback = 'Good effort.'; else if (perc >= 60) feedback = 'Fair performance.'; else feedback = 'Additional study is recommended.';

            // ensure results area
            let results = document.getElementById('results');
            if (!results) {
                results = document.createElement('div'); results.id = 'results'; results.className = 'results';
                results.innerHTML = `<div class="score" id="scoreDisplay"></div><div class="feedback" id="feedback"></div><div class="results-buttons"><button class="btn" id="retake">Retake Quiz</button><button class="btn" id="back">Back to Module</button></div>`;
                cont.parentNode.insertBefore(results, cont.nextSibling.nextSibling || cont.nextSibling);
                document.getElementById('retake').addEventListener('click', () => location.reload());
                document.getElementById('back').addEventListener('click', () => { window.location.href = '../index.html'; });
            }
            document.getElementById('scoreDisplay').textContent = `${correct}/${randomized.length} (${perc}%)`;
            document.getElementById('feedback').textContent = feedback;
            results.classList.add('show');
            submitBtn.disabled = true;
            results.scrollIntoView({ behavior: 'smooth' });
        };
    }

    // initialize
    document.addEventListener('DOMContentLoaded', function () {
        const q = findQuestionsData();
        if (q && Array.isArray(q)) {
            renderQuiz(q);
        } else {
            // no structured data found; do nothing
            // could optionally try to parse older HTML-style quizzes
        }

        // Disable legacy paged quiz UI if present: hide navigation, timers, progress and neutralize functions
        try {
            const nav = document.querySelectorAll('.navigation, #prevBtn, #nextBtn');
            nav.forEach(n => { if (n && n.style) n.style.display = 'none'; });
            const timer = document.getElementById('timer'); if (timer) timer.style.display = 'none';
            const progress = document.getElementById('progress'); if (progress) progress.style.display = 'none';
            // neutralize legacy functions if they exist
            window.nextQuestion = window.previousQuestion = window.updateNavigation = function () { };
            window.restartQuiz = window.restartQuiz || function () { location.reload(); };
        } catch (e) { }
    });

})();
