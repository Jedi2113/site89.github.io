(function(){
  function runCheck(){
    try {
      const getRequired = () => {
        const meta = document.querySelector('meta[name="required-clearance"]');
        if (meta && meta.content) return meta.content;
        const b = document.body.getAttribute('data-required-clearance');
        if (b) return b;
        return null;
      };

      const required = getRequired();
      if (!required) return; // no restriction on this page

      const parseClearance = (v) => {
        if (v === undefined || v === null) return NaN;
        if (typeof v === 'number') return v;
        const s = String(v);
        const m = s.match(/\d+/);
        return m ? parseInt(m[0], 10) : NaN;
      };

      const userCharRaw = localStorage.getItem('selectedCharacter');
      let userClearance = NaN;

      if (userCharRaw) {
        try {
          const char = JSON.parse(userCharRaw);
          userClearance = parseClearance(char.clearance);
        } catch (e) {
          userClearance = NaN;
        }
      }

      const reqNum = parseClearance(required);
      if (Number.isNaN(reqNum)) return; // invalid required value, allow

      if (Number.isNaN(userClearance) || userClearance < reqNum) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace('/403.html?from=' + next);
      }
    } catch (err) {
      console.error('access check error', err);
    }
  }

  document.addEventListener('includesLoaded', runCheck);
  document.addEventListener('DOMContentLoaded', runCheck);
  // Immediate attempt in case script runs after events already fired
  runCheck();
  // also attempt a fallback run shortly after load to cover remaining race conditions
  window.setTimeout(runCheck, 250);
})();