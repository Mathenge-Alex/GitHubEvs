const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());

const GITHUB_TOKEN = "your_github_token";

const countries = [
    "Kenya"
];

const cacheFilePath = "data.json";

const fetchCommitCount = async (username, fromDate) => {
    const query = `
    query($username: String!, $fromDate: GitTimestamp!) {
    user(login: $username) {
        repositories(first: 100, isFork: false) {
        edges {
            node {
            name
            defaultBranchRef {
                target {
                ... on Commit {
                    history(first: 0, since: $fromDate) {
                    totalCount
                    }
                }
                }
            }
            }
        }
        }
    }
    }
`;

    const variables = {
        username: username,
        fromDate: fromDate.toISOString(),
    };

    const response = await axios.post(
        "https://api.github.com/graphql",
        {
            query,
            variables,
        },
        {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
            },
        }
    );

    let totalCommits = 0;
    response.data.data.user.repositories.edges.forEach((repo) => {
        if (repo.node.defaultBranchRef) {
            totalCommits += repo.node.defaultBranchRef.target.history.totalCount;
        }
    });

    return totalCommits;
};

const fetchGitHubData = async () => {
    let data = { countries: [] };
    let lastUpdate = new Date();
    lastUpdate.setFullYear(lastUpdate.getFullYear() - 1); // Default to one year ago

    // Read cached data and last update timestamp
    if (fs.existsSync(cacheFilePath)) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
        data = cachedData.data;
        lastUpdate = new Date(cachedData.lastUpdate);
    }

    const newUpdate = new Date();

    for (let country of countries) {
        let countryData = data.countries.find((c) => c.name === country) || {
            name: country,
            users: [],
        };

        let query = `location:${country}`;

        try {
            console.log(`Fetching data for ${country}`);
            let response = await axios.get(
                `https://api.github.com/search/users?q=${query}&per_page=10`,
                {
                    headers: { Authorization: `token ${GITHUB_TOKEN}` },
                }
            );

            const userPromises = response.data.items.map(async (user) => {
                try {
                    let userDetails = await axios.get(user.url, {
                        headers: { Authorization: `token ${GITHUB_TOKEN}` },
                    });

                    let existingUser = countryData.users.find(
                        (u) => u.username === userDetails.data.login
                    );
                    let fromDate = new Date();
                    fromDate.setFullYear(fromDate.getFullYear() - 1);

                    if (existingUser) {
                        fromDate = new Date(existingUser.lastUpdate);
                    }

                    let totalCommits = await fetchCommitCount(
                        userDetails.data.login,
                        fromDate
                    );

                    if (existingUser) {
                        existingUser.commits += totalCommits;
                        existingUser.lastUpdate = newUpdate.toISOString();
                    } else {
                        countryData.users.push({
                            username: userDetails.data.login,
                            icon: userDetails.data.avatar_url,
                            location: userDetails.data.location,
                            commits: totalCommits,
                            bio: userDetails.data.bio,
                            lastUpdate: newUpdate.toISOString(),
                        });
                    }
                } catch (userDetailsError) {
                    console.error(
                        `Error fetching details for user ${user.login}:`,
                        userDetailsError.message
                    );
                }
            });

            await Promise.all(userPromises);
        } catch (error) {
            console.error(`Error fetching data for ${country}:`, error.message);
        }

        // Ensure countryData.users is updated correctly
        const existingCountryIndex = data.countries.findIndex(
            (c) => c.name === country
        );
        if (existingCountryIndex !== -1) {
            data.countries[existingCountryIndex] = countryData;
        } else {
            data.countries.push(countryData);
        }
    }

    // Write data to a JSON file with the new timestamp
    try {
        fs.writeFileSync(
            cacheFilePath,
            JSON.stringify({ data, lastUpdate: newUpdate.toISOString() }, null, 2)
        );
        console.log("Data written to data.json");
    } catch (writeError) {
        console.error("Error writing data to file:", writeError.message);
    }
};

cron.schedule("0 0 * * *", fetchGitHubData);

fetchGitHubData();

app.get("/data", (req, res) => {
    fs.readFile(cacheFilePath, "utf8", (err, data) => {
        if (err) {
            res.status(500).send("Error reading data");
            return;
        }
        res.send(data);
    });
});

app.listen(port, () => {
    console.log(`GitHubEvs backend service running at http://localhost:${port}`);
});
