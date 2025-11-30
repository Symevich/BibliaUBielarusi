async function loadSection(section) {
    try {
        const response = await fetch("../json/catalog_en.json");
        const data = await response.json();

        const exhibits = data.filter((e) => String(e.section) === String(section));

        if (!exhibits.length) {
            document.getElementById("section-title").textContent = "Section " + section;
            document.getElementById("exhibit-list").innerHTML =
                "<p>This section has no exhibits.</p>";
            return;
        }

        document.getElementById("section-title").textContent = "Section " + section;

        const listHtml = exhibits
            .map((e) => {
                const isIntro = typeof e.id === "string" && e.id.startsWith("intro_");
                const numBlock = isIntro
                    ? `<p class="btn-num">Preface</p>`
                    : `<p class="btn-num">Exhibit ${e.id}</p>`;

                const imgs = Array.isArray(e.img) ? e.img : [e.img];
                const icoImg = imgs.find((src) => src && src.includes("_ico."));
                const normalImg = imgs.find((src) => src && !src.includes("_ico."));
                const imgSrc = icoImg || normalImg || "";

                return `
                <li>
                  <a href="exhibit.html?section=${e.section}&id=${e.id}" class="button">
                    <div class="img-container">
                      ${imgSrc
                        ? `<img src="${imgSrc}" alt="Exhibit icon" class="btn-img">`
                        : ""
                    }
                    </div>
                    <div class="txt-container">
                      ${numBlock}
                      <h3 class="btn-title">${e.title}</h3>
                    </div>
                  </a>
                </li>
              `;
            })
            .join("");

        document.getElementById("exhibit-list").innerHTML = listHtml;
    } catch (err) {
        document.getElementById("section-title").textContent = "Error";
        document.getElementById("exhibit-list").innerHTML =
            "<p>Failed to load exhibits.</p>";
        console.error(err);
    }
}

const params = new URLSearchParams(window.location.search);
const section = params.get("section");

if (section) {
    loadSection(section);
} else {
    document.getElementById("section-title").textContent = "Section not specified";
    document.getElementById("exhibit-list").innerHTML =
        "<p>The parameter 'section' is not specified.</p>";
}
