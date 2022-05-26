import { useEffect, useState } from "react";
import { API_URL } from "shared/constants";
import { Button } from "@material-ui/core";

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      const data = await fetch(`${API_URL}/Blogs`);
      setBlogs(await data.json());
    };

    try {
      fetchData();
    } catch (e) {
      console.log(e.message);
    }

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div>
      <h1>Blogs:</h1>
      <p>{blogs}!</p>
      <Button color="primary">Button</Button>
    </div>
  );
};

export default Blogs;
