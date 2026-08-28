function Marketplace() {

    const items = [
        {
            id:1,
            title:"Research Paper PDF",
            type:"Document",
            price:"0.05 ETH",
            status:"Verified"
        },

        {
            id:2,
            title:"AI Dataset",
            type:"Data File",
            price:"0.08 ETH",
            status:"Verified"
        },

        {
            id:3,
            title:"Digital Certificate",
            type:"Certificate",
            price:"0.03 ETH",
            status:"Verified"
        }
    ];


    return (

        <div className="marketplace-page">

            <h1>🛒 Marketplace</h1>

            <p className="subtitle">
                Buy and sell blockchain verified digital assets
            </p>



            <div className="market-grid">


                {
                    items.map((item)=>(

                        <div className="market-card" key={item.id}>


                            <h2>📄 {item.title}</h2>


                            <p>
                                Type: {item.type}
                            </p>


                            <p>
                                Price: {item.price}
                            </p>


                            <span className="verified">
                                ✔ {item.status}
                            </span>


                            <button>
                                Buy Now
                            </button>


                        </div>

                    ))
                }


            </div>


        </div>

    );

}


export default Marketplace;