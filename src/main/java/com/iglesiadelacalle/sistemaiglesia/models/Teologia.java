package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "teologia")
public class Teologia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idTeologia;

    @Column(length = 50, nullable = false, unique = true)
    private String denominacion;

    @Column(length = 150, nullable = false)
    private String descripcion; 

    @Column(length = 20)
    private String estado = "Activo";

    // Una Teología tiene sus temas asociados (Ej. 4 temas)
    @OneToMany(mappedBy = "teologia", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Tema> temas;

    // --- GETTERS Y SETTERS ---

    public Integer getIdTeologia() { return idTeologia; }
    public void setIdTeologia(Integer idTeologia) { this.idTeologia = idTeologia; }

    public String getDenominacion() { return denominacion; }
    public void setDenominacion(String denominacion) { this.denominacion = denominacion; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public List<Tema> getTemas() { return temas; }
    public void setTemas(List<Tema> temas) { this.temas = temas; }
}